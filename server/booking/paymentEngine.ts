import { db } from "../db";
import {
  sessions, wallets, walletTransactions, bookingPayments, payments, refunds,
  paymentAuditLogs, sessionTemplates, professionalProfiles, earnings,
  type Session, type BookingPayment, type Payment, type Refund,
} from "@shared/schema";
import { eq, and, sql, lt } from "drizzle-orm";
import type { Request } from "express";
import * as money from "../lib/money";
import { computePricing, decomposeLockedPrice, type PriceBreakdown } from "../pricing";
import { computeSplit } from "../lib/pricingMath";
import { autoRefundIdempotencyKey } from "../lib/idempotency";
import { applyRefundOutcomes, type RefundOutcome } from "../lib/refundOutcomes";
import { allocateRefund, RefundExceedsBalanceError } from "../lib/refundAllocation";
import { isUniqueViolation } from "../lib/dbErrors";
import { createRazorpayOrder, createRazorpayRefund, verifyPaymentSignature, getRazorpayKeyId } from "../razorpayClient";
import { logSecurityEvent } from "../security/events";
import { storage } from "../storage";
import { broadcastToRoom } from "../realtime";

async function notifyBookingConfirmed(session: Session): Promise<void> {
  const label = session.mode === "instant" ? "Instant session request sent" : "Booking confirmed";
  await storage.createNotification({
    userId: session.clientId,
    type: "booking_confirmed",
    title: label,
    body: session.mode === "scheduled" ? `Your session on ${new Date(session.scheduledAt).toLocaleString()} is confirmed.` : "Waiting for the professional to accept.",
    relatedSessionId: session.id,
  });
  if (session.mode === "scheduled") {
    // The client's own notification bell previously only updated on the
    // next 60s poll or popover open — every other booking-lifecycle event
    // (accept/decline/timeout) pushes live to the client's inbox room, this
    // one just never had the matching broadcast.
    broadcastToRoom(`client_${session.clientId}`, {
      type: "booking_confirmed",
      session,
    });
    await storage.createNotification({
      userId: session.professionalId,
      type: "booking_confirmed",
      title: "New booking confirmed",
      body: `A session is booked for ${new Date(session.scheduledAt).toLocaleString()}.`,
      relatedSessionId: session.id,
    });
    // Scheduled bookings need no accept/decline step, but the professional's
    // dashboard previously had no way to learn about them except a full page
    // refresh — the "New Session Request" WS push only ever covered instant
    // requests. Reuse the same inbox room so the dashboard can react live.
    broadcastToRoom(`prof_${session.professionalId}`, {
      type: "new_scheduled_booking",
      session,
    });
  }
}

// Two independent call sites previously each did their own "read session,
// check status !== 'completed', then write" — server/realtime.ts's
// finalizeSessionBilling (server-authoritative, fires after the WS room
// empties + a grace period) and the PATCH /api/sessions/:id/status route
// (fires when the client's own "End Session" button calls the REST API).
// Neither held a lock, so both could see the pre-completion status at once
// and both create a payout — confirmed in production: two sessions each
// have two identical, millisecond-apart earnings rows. This is now the
// single, atomic place either path calls to mark a session completed and
// create its payout, with a FOR UPDATE lock closing the race and an
// idempotent no-op if the session is already completed.
export async function completeSessionAndPayout(
  sessionId: string,
  effectiveStart?: Date,
  effectiveEnd?: Date,
  effectiveDuration?: number
): Promise<{ alreadyCompleted: boolean; payoutAmount?: string }> {
  return await db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for("update");
    if (!session) throw new NotFoundError("Session not found");
    if (session.status === "completed") return { alreadyCompleted: true };

    // The amount charged is always the fixed price locked at booking time,
    // never derived from elapsed minutes — durationMinutes is recorded for
    // analytics/overrun visibility only.
    const totalCost = session.priceAtBooking ?? undefined;
    let payoutAmount: string | undefined;
    if (totalCost && effectiveStart) {
      const pricing = decomposeLockedPrice(totalCost);
      payoutAmount = money.sub(pricing.base, pricing.commission);
    }

    await tx
      .update(sessions)
      .set({
        status: "completed",
        ...(effectiveStart && { startTime: effectiveStart }),
        ...(effectiveEnd && { endTime: effectiveEnd }),
        ...(effectiveDuration && { durationMinutes: effectiveDuration }),
        ...(totalCost && { totalCost }),
      })
      .where(eq(sessions.id, sessionId));

    if (payoutAmount && Number(payoutAmount) > 0) {
      await tx.insert(earnings).values({
        professionalId: session.professionalId,
        sessionId,
        amount: payoutAmount,
        status: "pending",
      });
    }

    return { alreadyCompleted: false, payoutAmount };
  });
}

async function notifyRefund(sessionId: string, userId: string, reason: string): Promise<void> {
  await storage.createNotification({
    userId,
    type: "refund_initiated",
    title: "Refund initiated",
    body: `Your payment for booking ${sessionId} is being refunded (${reason.replace(/_/g, " ")}).`,
  });
}

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class InvalidStateError extends Error {}
export class SlotConflictError extends Error {
  constructor() { super("That slot is no longer available"); }
}
export class InsufficientBalanceError extends Error {
  constructor() { super("Wallet balance is insufficient"); }
}
export class BookingUnavailableError extends Error {
  constructor() { super("This booking is no longer available — any captured payment has been refunded"); }
}
export class InvalidSignatureError extends Error {
  constructor() { super("Payment signature verification failed"); }
}

const RESERVATION_TTL_MS = Number(process.env.PAYMENT_RESERVATION_TTL_MS ?? 5 * 60 * 1000);

interface ReserveSlotInput {
  clientId: string;
  professionalId: string;
  consultationType: string; // 'chat' | 'audio' | 'video'
  sessionTemplateId: string;
  mode: "instant" | "scheduled";
  scheduledAt?: Date; // required for scheduled; ignored for instant (uses now)
}

// Reserves a booking slot, server-computes and locks the price, before any
// money moves. Race-safety comes from a per-professional Postgres advisory
// lock held for the transaction's duration, plus the partial UNIQUE indexes
// on sessions as a DB-level backstop.
export async function reserveSlot(input: ReserveSlotInput): Promise<{ session: Session; pricing: PriceBreakdown }> {
  const [template] = await db.select().from(sessionTemplates).where(eq(sessionTemplates.id, input.sessionTemplateId));
  if (!template) throw new NotFoundError("Session template not found");

  const [profile] = await db.select().from(professionalProfiles).where(eq(professionalProfiles.userId, input.professionalId));
  if (!profile || profile.suspendedAt || !profile.isAvailable) {
    throw new NotFoundError("Professional not available");
  }
  if (input.mode === "instant" && !profile.isOnline) {
    throw new InvalidStateError("Professional is not online for an instant session");
  }
  if (input.mode === "scheduled" && !input.scheduledAt) {
    throw new InvalidStateError("scheduledAt is required for a scheduled session");
  }

  const pricing = await computePricing(input.professionalId, input.consultationType, input.sessionTemplateId);
  const scheduledAt = input.mode === "instant" ? new Date() : input.scheduledAt!;
  const durationMinutes = template.durationMinutes;
  const respondBy = input.mode === "instant"
    ? new Date(Date.now() + profile.instantSessionTimeoutSeconds * 1000)
    : null;

  return await db.transaction(async (tx) => {
    // Serializes every reservation attempt for this professional so the
    // overlap check below can't race against a concurrent reservation.
    // Auto-released at transaction end (commit or rollback) — no manual unlock.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.professionalId}))`);

    if (input.mode === "scheduled") {
      const overlap = await tx.execute(sql`
        SELECT id FROM sessions
        WHERE professional_id = ${input.professionalId}
          AND status NOT IN ('cancelled')
          AND scheduled_at < (${scheduledAt.toISOString()}::timestamp + (${durationMinutes} || ' minutes')::interval)
          AND (scheduled_at + (COALESCE(planned_duration_minutes, 60) || ' minutes')::interval) > ${scheduledAt.toISOString()}::timestamp
      `);
      if (overlap.rows.length > 0) {
        throw new SlotConflictError();
      }
    }

    let session: Session;
    try {
      const [row] = await tx
        .insert(sessions)
        .values({
          clientId: input.clientId,
          professionalId: input.professionalId,
          scheduledAt,
          status: "payment_pending",
          type: input.consultationType,
          mode: input.mode,
          sessionTemplateId: input.sessionTemplateId,
          plannedDurationMinutes: durationMinutes,
          priceAtBooking: pricing.total,
          respondBy: respondBy ?? undefined,
        })
        .returning();
      session = row;
    } catch (err: any) {
      if (isUniqueViolation(err)) throw new SlotConflictError();
      throw err;
    }

    await tx.insert(paymentAuditLogs).values({
      sessionId: session.id,
      userId: input.clientId,
      actorType: "client",
      action: "slot_reserved",
      amount: pricing.total,
      metadata: { baseAmount: pricing.base, discountAmount: pricing.discount, taxAmount: pricing.tax, commission: pricing.commission },
    });

    return { session, pricing };
  });
}

// setInterval sweep (called from server/index.ts) releasing expired
// 'payment_pending' reservations back to 'cancelled'.
export async function releaseExpiredReservations(): Promise<number> {
  const cutoff = new Date(Date.now() - RESERVATION_TTL_MS);
  const expired = await db
    .select({ id: sessions.id, professionalId: sessions.professionalId })
    .from(sessions)
    .where(and(eq(sessions.status, "payment_pending"), lt(sessions.createdAt, cutoff)));

  let released = 0;
  for (const row of expired) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${row.professionalId}))`);
      const [current] = await tx.select().from(sessions).where(eq(sessions.id, row.id));
      if (!current || current.status !== "payment_pending") return; // already progressed elsewhere

      await tx.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, row.id));
      await tx.insert(paymentAuditLogs).values({
        sessionId: row.id,
        actorType: "system",
        action: "slot_released_ttl_expired",
      });
      released++;
    });
  }
  return released;
}

async function assertPayable(sessionId: string, userId: string): Promise<Session> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) throw new NotFoundError("Booking not found");
  if (session.clientId !== userId) throw new ForbiddenError();
  if (session.status !== "payment_pending") throw new InvalidStateError("Booking is no longer awaiting payment");
  return session;
}

// Full wallet payment — one atomic transaction. Idempotent: a retried call
// against an already-funded booking is a safe no-op.
export async function payFullyFromWallet(sessionId: string, userId: string): Promise<BookingPayment[]> {
  await assertPayable(sessionId, userId);

  let confirmedSession: Session | null = null;

  const result = await db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for("update");
    if (!session || session.clientId !== userId) throw new ForbiddenError();
    if (session.status !== "payment_pending") throw new InvalidStateError("Booking is no longer awaiting payment");

    const existing = await tx.select().from(bookingPayments).where(eq(bookingPayments.sessionId, sessionId));
    if (existing.length > 0) return existing;

    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
    if (!wallet || !money.isGreaterThanOrEqual(wallet.balance, session.priceAtBooking!)) {
      throw new InsufficientBalanceError();
    }

    await tx
      .update(wallets)
      .set({ balance: money.sub(wallet.balance, session.priceAtBooking!), updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));

    const [walletTxn] = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "payment",
        amount: session.priceAtBooking!,
        description: `Session payment — booking ${sessionId}`,
        sessionId,
      })
      .returning();

    const pricing = decomposeLockedPrice(session.priceAtBooking!);

    const [bp] = await tx
      .insert(bookingPayments)
      .values({
        sessionId,
        fundingSourceType: "wallet",
        fundingSourceId: walletTxn.id,
        amount: session.priceAtBooking!,
        status: "succeeded",
        baseAmount: pricing.base,
        discountAmount: pricing.discount,
        taxAmount: pricing.tax,
        platformCommissionAmount: pricing.commission,
        totalBookingAmount: session.priceAtBooking!,
      })
      .returning();

    await tx
      .update(sessions)
      .set({ status: session.mode === "instant" ? "pending" : "scheduled" })
      .where(eq(sessions.id, sessionId));

    await tx.insert(paymentAuditLogs).values([
      { sessionId, userId, actorType: "client", action: "wallet_debited", amount: session.priceAtBooking!, bookingPaymentId: bp.id },
      { sessionId, userId, actorType: "system", action: "booking_marked_paid", amount: session.priceAtBooking! },
    ]);

    confirmedSession = { ...session, status: session.mode === "instant" ? "pending" : "scheduled" };
    return [bp];
  });

  if (confirmedSession) {
    await notifyBookingConfirmed(confirmedSession).catch(() => {});
  }
  return result;
}

export interface InitiatePaymentResult {
  alreadyPaid?: boolean;
  bookingPayments?: BookingPayment[];
  razorpayOrderId?: string;
  gatewayPortion?: string;
  walletPortion?: string;
  keyId?: string;
  currency?: string;
}

// Order creation for a gateway-involving payment (Pay Now, or the gateway
// leg of a Split payment). No DB transaction is held across the Razorpay
// network call — see verifyAndCapturePayment for where money actually moves.
export async function initiateGatewayPayment(
  sessionId: string,
  userId: string,
  idempotencyKey: string,
  useWalletPortion: boolean
): Promise<InitiatePaymentResult> {
  const [existingPayment] = await db.select().from(payments).where(eq(payments.idempotencyKey, idempotencyKey));
  if (existingPayment) {
    return {
      razorpayOrderId: existingPayment.gatewayOrderId,
      gatewayPortion: existingPayment.amount,
      walletPortion: existingPayment.plannedWalletPortion,
      keyId: getKeyIdSafe(),
      currency: existingPayment.currency,
    };
  }

  const session = await assertPayable(sessionId, userId);

  const [wallet] = useWalletPortion ? await db.select().from(wallets).where(eq(wallets.userId, userId)) : [undefined];
  const { walletPortion, gatewayPortion } = computeSplit(wallet?.balance ?? "0", session.priceAtBooking!, useWalletPortion);

  if (!money.isPositive(gatewayPortion)) {
    // Fully covered by wallet — no gateway order needed at all.
    const bp = await payFullyFromWallet(sessionId, userId);
    return { alreadyPaid: true, bookingPayments: bp };
  }

  const order = await createRazorpayOrder(money.toPaise(gatewayPortion), idempotencyKey, {
    sessionId,
    walletPortion,
  });

  const [paymentRow] = await db
    .insert(payments)
    .values({
      userId,
      sessionId,
      gateway: "razorpay",
      gatewayOrderId: order.id,
      amount: gatewayPortion,
      plannedWalletPortion: walletPortion,
      status: "created",
      idempotencyKey,
    })
    .returning();

  await db.insert(paymentAuditLogs).values({
    sessionId,
    userId,
    actorType: "client",
    action: "payment_order_created",
    amount: gatewayPortion,
    paymentId: paymentRow.id,
  });

  return {
    razorpayOrderId: order.id,
    gatewayPortion,
    walletPortion,
    keyId: getKeyIdSafe(),
    currency: "INR",
  };
}

function getKeyIdSafe(): string | undefined {
  try {
    return getRazorpayKeyId();
  } catch {
    return undefined;
  }
}

// Verifies a Razorpay checkout callback and, if valid, atomically records
// the capture. Used by the client-side post-checkout callback — the
// signature here is the per-payment order|payment HMAC Razorpay Checkout
// returns to the browser.
export async function verifyAndCapturePayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  req?: Request
): Promise<{ alreadyProcessed?: boolean; bookingPayments?: BookingPayment[] }> {
  const [already] = await db.select().from(payments).where(eq(payments.gatewayPaymentId, razorpayPaymentId));
  if (already && already.status === "captured") {
    return { alreadyProcessed: true };
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    await logSecurityEvent({ type: "payment.verification_failed", req, metadata: { razorpayOrderId } });
    throw new InvalidSignatureError();
  }

  return recordCapture(razorpayOrderId, razorpayPaymentId);
}

// Used by the server-to-server Razorpay webhook (payment.captured event).
// The caller has already verified the whole-payload webhook signature
// (a different HMAC scheme than the checkout callback's), so no further
// signature check happens here — this closes the gap where a browser tab
// dies after Razorpay captures money but before the client posts back.
export async function captureFromWebhook(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ alreadyProcessed?: boolean; bookingPayments?: BookingPayment[] }> {
  return recordCapture(razorpayOrderId, razorpayPaymentId);
}

async function recordCapture(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ alreadyProcessed?: boolean; bookingPayments?: BookingPayment[] }> {
  const [already] = await db.select().from(payments).where(eq(payments.gatewayPaymentId, razorpayPaymentId));
  if (already && already.status === "captured") {
    return { alreadyProcessed: true };
  }

  let capturedPaymentIdForRefund: string | null = null;
  let confirmedSession: Session | null = null;

  try {
    const result = await db.transaction(async (tx) => {
      const [paymentRow] = await tx.select().from(payments).where(eq(payments.gatewayOrderId, razorpayOrderId)).for("update");
      if (!paymentRow) throw new NotFoundError("Payment order not found");
      if (paymentRow.status === "captured") return { bookingPayments: [] as BookingPayment[] };

      const [session] = await tx.select().from(sessions).where(eq(sessions.id, paymentRow.sessionId)).for("update");
      if (!session) throw new NotFoundError("Booking not found");

      await tx
        .update(payments)
        .set({ status: "captured", gatewayPaymentId: razorpayPaymentId, signatureVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.id, paymentRow.id));

      if (session.status !== "payment_pending") {
        capturedPaymentIdForRefund = paymentRow.id;
        throw new BookingUnavailableError();
      }

      const pricing = decomposeLockedPrice(session.priceAtBooking!);
      const rows: BookingPayment[] = [];

      const walletPortion = Number(paymentRow.plannedWalletPortion);
      if (walletPortion > 0) {
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, session.clientId)).for("update");
        if (!wallet || Number(wallet.balance) < walletPortion) {
          capturedPaymentIdForRefund = paymentRow.id;
          throw new BookingUnavailableError();
        }

        await tx
          .update(wallets)
          .set({ balance: money.sub(wallet.balance, walletPortion.toFixed(2)), updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        const [wtxn] = await tx
          .insert(walletTransactions)
          .values({
            walletId: wallet.id,
            type: "payment",
            amount: walletPortion.toFixed(2),
            description: `Session payment (split) — booking ${session.id}`,
            sessionId: session.id,
          })
          .returning();

        const [walletLeg] = await tx
          .insert(bookingPayments)
          .values({
            sessionId: session.id,
            fundingSourceType: "wallet",
            fundingSourceId: wtxn.id,
            amount: walletPortion.toFixed(2),
            status: "succeeded",
            baseAmount: pricing.base,
            discountAmount: pricing.discount,
            taxAmount: pricing.tax,
            platformCommissionAmount: pricing.commission,
            totalBookingAmount: session.priceAtBooking!,
          })
          .returning();
        rows.push(walletLeg);
      }

      const [gatewayLeg] = await tx
        .insert(bookingPayments)
        .values({
          sessionId: session.id,
          fundingSourceType: "gateway",
          fundingSourceId: paymentRow.id,
          amount: paymentRow.amount,
          status: "succeeded",
          baseAmount: pricing.base,
          discountAmount: pricing.discount,
          taxAmount: pricing.tax,
          platformCommissionAmount: pricing.commission,
          totalBookingAmount: session.priceAtBooking!,
        })
        .returning();
      rows.push(gatewayLeg);

      const newStatus = session.mode === "instant" ? "pending" : "scheduled";
      await tx.update(sessions).set({ status: newStatus }).where(eq(sessions.id, session.id));

      await tx.insert(paymentAuditLogs).values([
        { sessionId: session.id, actorType: "gateway_webhook", action: "payment_signature_verified", paymentId: paymentRow.id },
        { sessionId: session.id, actorType: "gateway_webhook", action: "payment_captured", amount: paymentRow.amount, paymentId: paymentRow.id },
        ...(walletPortion > 0
          ? [{ sessionId: session.id, actorType: "system", action: "wallet_debited", amount: walletPortion.toFixed(2) }]
          : []),
        { sessionId: session.id, actorType: "system", action: "booking_marked_paid", amount: session.priceAtBooking! },
      ]);

      confirmedSession = { ...session, status: newStatus };
      return { bookingPayments: rows };
    });

    if (confirmedSession) {
      await notifyBookingConfirmed(confirmedSession).catch(() => {});
    }
    return result;
  } catch (err) {
    if (err instanceof BookingUnavailableError && capturedPaymentIdForRefund) {
      await refundCapturedButUnbookedPayment(capturedPaymentIdForRefund);
      throw err;
    }
    throw err;
  }
}

// Rare edge case: a Razorpay payment captured successfully but the booking
// it was for expired (TTL sweep) or hit a wallet shortfall in the same
// instant — so no bookingPayments row (and hence no refunds row, whose FK
// requires one) was ever created for it. Refunded directly via the gateway
// and recorded in paymentAuditLogs rather than the refunds table, since
// there is no funding leg for a refunds row to reference.
async function refundCapturedButUnbookedPayment(paymentId: string): Promise<void> {
  const [paymentRow] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!paymentRow || !paymentRow.gatewayPaymentId || paymentRow.status === "refunded") return;

  try {
    const gwRefund = await createRazorpayRefund(paymentRow.gatewayPaymentId, money.toPaise(paymentRow.amount), {
      reason: "booking_unconfirmable",
    });
    await db.update(payments).set({ status: "refunded", updatedAt: new Date() }).where(eq(payments.id, paymentRow.id));
    await db.insert(paymentAuditLogs).values({
      sessionId: paymentRow.sessionId,
      actorType: "system",
      action: "refund_completed",
      amount: paymentRow.amount,
      paymentId: paymentRow.id,
      metadata: { gatewayRefundId: gwRefund.id, reason: "payment_captured_but_booking_unconfirmable" },
    });
  } catch (err: any) {
    await db.insert(paymentAuditLogs).values({
      sessionId: paymentRow.sessionId,
      actorType: "system",
      action: "refund_failed",
      amount: paymentRow.amount,
      paymentId: paymentRow.id,
      metadata: { error: err.message },
    });
  }
}

// Automatic refund (reject / timeout / admin-manual). Reverses every
// successful funding leg of a booking: wallet legs credited back
// synchronously inside the transaction; gateway legs call the real Razorpay
// refund API after commit (external calls never happen inside a DB
// transaction — a rollback can't undo a call already made to Razorpay).
export async function refundBooking(
  sessionId: string,
  reason: string,
  initiatedBy: string | null = null
): Promise<Refund[]> {
  const createdRefunds = await db.transaction(async (tx) => {
    const legs = await tx
      .select()
      .from(bookingPayments)
      .where(and(eq(bookingPayments.sessionId, sessionId), eq(bookingPayments.status, "succeeded")))
      .for("update");

    if (legs.length === 0) {
      await tx.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, sessionId));
      return [];
    }

    const created: Refund[] = [];
    for (const leg of legs) {
      const legKey = autoRefundIdempotencyKey(sessionId, leg.id);
      const [already] = await tx.select().from(refunds).where(eq(refunds.idempotencyKey, legKey));
      if (already) {
        created.push(already);
        continue;
      }

      if (leg.fundingSourceType === "wallet") {
        const [wtxn] = await tx.select().from(walletTransactions).where(eq(walletTransactions.id, leg.fundingSourceId));
        if (!wtxn) continue;
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, wtxn.walletId)).for("update");
        if (!wallet) continue;

        await tx
          .update(wallets)
          .set({ balance: money.add(wallet.balance, leg.amount), updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        const [creditTxn] = await tx
          .insert(walletTransactions)
          .values({
            walletId: wallet.id,
            type: "refund",
            amount: leg.amount,
            description: `Refund — booking ${sessionId} (${reason})`,
            sessionId,
          })
          .returning();

        const [refundRow] = await tx
          .insert(refunds)
          .values({
            sessionId,
            bookingPaymentId: leg.id,
            fundingSourceType: "wallet",
            amount: leg.amount,
            reason,
            initiatedBy,
            status: "succeeded",
            destination: "wallet",
            walletTransactionId: creditTxn.id,
            idempotencyKey: legKey,
            completedAt: new Date(),
          })
          .returning();

        await tx.update(bookingPayments).set({ status: "refunded" }).where(eq(bookingPayments.id, leg.id));
        created.push(refundRow);
      } else if (leg.fundingSourceType === "gateway") {
        const [refundRow] = await tx
          .insert(refunds)
          .values({
            sessionId,
            bookingPaymentId: leg.id,
            fundingSourceType: "gateway",
            amount: leg.amount,
            reason,
            initiatedBy,
            status: "pending",
            destination: "source",
            idempotencyKey: legKey,
          })
          .returning();
        created.push(refundRow);
      }
    }

    await tx.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, sessionId));
    await tx.insert(paymentAuditLogs).values({
      sessionId,
      actorType: initiatedBy ? "admin" : "system",
      action: "refund_initiated",
    });
    return created;
  });

  // External Razorpay refund calls happen outside the transaction. The rows
  // in createdRefunds are a snapshot from before this loop runs — track the
  // real outcome per leg here so the function's return value reflects what
  // actually happened, not just what was attempted. Callers (the
  // cancellation and decline routes) previously ignored this return value
  // entirely and always told the client "refund initiated," even when a
  // gateway refund failed here with no retry ever scheduled.
  const legStatusOnSuccess = new Map(createdRefunds.map((r) => [r.id, "refunded" as const]));
  const finalOutcome = await settlePendingGatewayRefunds(createdRefunds, sessionId, initiatedBy, legStatusOnSuccess);

  if (createdRefunds.length > 0) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (session) await notifyRefund(sessionId, session.clientId, reason).catch(() => {});
  }

  return applyRefundOutcomes(createdRefunds, finalOutcome);
}

// Shared by refundBooking and issuePartialRefund — completes every
// gateway-funded refund left 'pending' after the DB transaction by calling
// the real Razorpay refund API (external calls never happen inside a DB
// transaction — a rollback can't undo a call already made to Razorpay), and
// records the real outcome. legStatusOnSuccess tells it what bookingPayments
// status a given refund's success implies: refundBooking always drains a
// leg entirely ('refunded'), while a partial refund may only partially
// drain it ('partially_refunded').
async function settlePendingGatewayRefunds(
  createdRefunds: Refund[],
  sessionId: string,
  initiatedBy: string | null,
  legStatusOnSuccess: Map<string, "refunded" | "partially_refunded">
): Promise<Map<string, RefundOutcome>> {
  const finalOutcome = new Map<string, RefundOutcome>();
  for (const r of createdRefunds.filter((r) => r.fundingSourceType === "gateway" && r.status === "pending")) {
    try {
      const [paymentRow] = await db
        .select()
        .from(payments)
        .innerJoin(bookingPayments, eq(bookingPayments.fundingSourceId, payments.id))
        .where(eq(bookingPayments.id, r.bookingPaymentId));

      if (!paymentRow?.payments.gatewayPaymentId) {
        throw new Error("No captured gateway payment to refund");
      }

      const gwRefund = await createRazorpayRefund(paymentRow.payments.gatewayPaymentId, money.toPaise(r.amount), {
        refundId: r.id,
      });

      await db
        .update(refunds)
        .set({ status: "succeeded", gatewayRefundId: gwRefund.id, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(refunds.id, r.id));
      await db.update(bookingPayments).set({ status: legStatusOnSuccess.get(r.id) ?? "refunded" }).where(eq(bookingPayments.id, r.bookingPaymentId));
      await db.insert(paymentAuditLogs).values({
        sessionId, refundId: r.id, amount: r.amount,
        actorType: initiatedBy ? "admin" : "system", action: "refund_completed",
      });
      finalOutcome.set(r.id, { status: "succeeded" });
    } catch (err: any) {
      await db
        .update(refunds)
        .set({ status: "failed", failureReason: err.message, updatedAt: new Date() })
        .where(eq(refunds.id, r.id));
      await db.insert(paymentAuditLogs).values({
        sessionId, refundId: r.id, amount: r.amount,
        actorType: initiatedBy ? "admin" : "system", action: "refund_failed",
        metadata: { failureReason: err.message },
      });
      console.error(`Refund ${r.id} for session ${sessionId} failed and needs manual follow-up:`, err.message);
      // No job queue exists in this app — a periodic sweep (same setInterval
      // pattern as releaseExpiredReservations) should retry refunds.status
      // IN ('pending','failed') older than a threshold; not built in this pass.
      // Until then, refunds.status='failed' rows are how ops discovers these.
      finalOutcome.set(r.id, { status: "failed", failureReason: err.message });
    }
  }
  return finalOutcome;
}

// Admin-issued partial refund — unlike refundBooking, this does not cancel
// the session or touch every funding leg; it returns a specific amount less
// than (or equal to) what remains refundable across the booking's succeeded
// legs, e.g. for a service-quality complaint on a session that otherwise
// completed normally. idempotencyKey must be caller-supplied (a retried
// admin request with the same key is a safe no-op) since, unlike the
// auto-refund path, there's no deterministic (sessionId, legId) key to
// derive — an admin can legitimately issue more than one partial refund
// against the same booking over time.
export async function issuePartialRefund(
  sessionId: string,
  amount: string,
  reason: string,
  initiatedBy: string,
  idempotencyKey: string
): Promise<Refund[]> {
  if (!money.isPositive(amount)) {
    throw new InvalidStateError("Refund amount must be greater than zero");
  }

  const { createdRefunds, legStatusOnSuccess } = await db.transaction(async (tx) => {
    // A per-leg row gets its own unique idempotencyKey (see below), so a
    // retry of this whole request is detected by prefix rather than exact
    // match — every row this request created starts with the caller's key.
    const existing = await tx.select().from(refunds).where(sql`${refunds.idempotencyKey} LIKE ${idempotencyKey + ":%"}`);
    if (existing.length > 0) return { createdRefunds: existing, legStatusOnSuccess: new Map<string, "refunded" | "partially_refunded">() };

    const legs = await tx
      .select()
      .from(bookingPayments)
      .where(and(eq(bookingPayments.sessionId, sessionId), sql`${bookingPayments.status} IN ('succeeded', 'partially_refunded')`))
      .for("update");
    if (legs.length === 0) {
      throw new InvalidStateError("No refundable payment found for this booking");
    }

    const priorRefunds = await tx
      .select()
      .from(refunds)
      .where(and(eq(refunds.sessionId, sessionId), sql`${refunds.status} IN ('pending', 'processing', 'succeeded')`));
    const refundedByLeg = new Map<string, string>();
    for (const r of priorRefunds) {
      refundedByLeg.set(r.bookingPaymentId, money.add(refundedByLeg.get(r.bookingPaymentId) ?? "0", r.amount));
    }

    let allocations;
    try {
      allocations = allocateRefund(
        legs.map((leg) => ({
          id: leg.id,
          fundingSourceType: leg.fundingSourceType as "wallet" | "gateway",
          amount: leg.amount,
          alreadyRefunded: refundedByLeg.get(leg.id) ?? "0",
        })),
        amount
      );
    } catch (err) {
      if (err instanceof RefundExceedsBalanceError) throw new InvalidStateError(err.message);
      throw err;
    }

    const legById = new Map(legs.map((leg) => [leg.id, leg]));
    const created: Refund[] = [];
    const legStatusOnSuccess = new Map<string, "refunded" | "partially_refunded">();

    for (const alloc of allocations) {
      const leg = legById.get(alloc.legId)!;
      const legAmount = alloc.amount;
      const legFullyDrained = alloc.legFullyDrained;
      const legKey = `${idempotencyKey}:leg:${leg.id}`;

      if (leg.fundingSourceType === "wallet") {
        const [wtxn] = await tx.select().from(walletTransactions).where(eq(walletTransactions.id, leg.fundingSourceId));
        if (!wtxn) continue;
        const [wallet] = await tx.select().from(wallets).where(eq(wallets.id, wtxn.walletId)).for("update");
        if (!wallet) continue;

        await tx
          .update(wallets)
          .set({ balance: money.add(wallet.balance, legAmount), updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        const [creditTxn] = await tx
          .insert(walletTransactions)
          .values({
            walletId: wallet.id,
            type: "refund",
            amount: legAmount,
            description: `Partial refund — booking ${sessionId} (${reason})`,
            sessionId,
          })
          .returning();

        const [refundRow] = await tx
          .insert(refunds)
          .values({
            sessionId,
            bookingPaymentId: leg.id,
            fundingSourceType: "wallet",
            amount: legAmount,
            reason,
            initiatedBy,
            status: "succeeded",
            destination: "wallet",
            walletTransactionId: creditTxn.id,
            idempotencyKey: legKey,
            completedAt: new Date(),
          })
          .returning();

        await tx.update(bookingPayments).set({ status: legFullyDrained ? "refunded" : "partially_refunded" }).where(eq(bookingPayments.id, leg.id));
        created.push(refundRow);
      } else if (leg.fundingSourceType === "gateway") {
        const [refundRow] = await tx
          .insert(refunds)
          .values({
            sessionId,
            bookingPaymentId: leg.id,
            fundingSourceType: "gateway",
            amount: legAmount,
            reason,
            initiatedBy,
            status: "pending",
            destination: "source",
            idempotencyKey: legKey,
          })
          .returning();
        legStatusOnSuccess.set(refundRow.id, legFullyDrained ? "refunded" : "partially_refunded");
        created.push(refundRow);
      }
    }

    await tx.insert(paymentAuditLogs).values({
      sessionId,
      actorType: "admin",
      action: "partial_refund_initiated",
      amount,
      metadata: { reason },
    });

    return { createdRefunds: created, legStatusOnSuccess };
  });

  const finalOutcome = await settlePendingGatewayRefunds(createdRefunds, sessionId, initiatedBy, legStatusOnSuccess);

  if (createdRefunds.length > 0) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (session) await notifyRefund(sessionId, session.clientId, reason).catch(() => {});
  }

  return applyRefundOutcomes(createdRefunds, finalOutcome);
}
