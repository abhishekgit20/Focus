// Daily reconciliation: compares what Stripe/Razorpay say actually happened
// against Focus's local payment records, and flags any disagreement to
// reconciliation_mismatches (surfaced in the admin dashboard + emailed).
// This is a defense-in-depth check, not the payment path itself — it exists
// to catch cases the webhook/verification flow should prevent but might
// miss (a dropped webhook, a gateway-side reversal after the fact, etc).
import { and, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { payments, walletTransactions, type ReconciliationMismatch, type InsertReconciliationMismatch } from "@shared/schema";
import { storage } from "./storage";
import { getRazorpayClient } from "./razorpayClient";
import { getUncachableStripeClient } from "./stripeClient";
import { sendReconciliationAlertEmail } from "./emailService";

// A daily job with a wider-than-a-day lookback so a slow webhook, clock
// skew, or a job run that gets delayed/retried doesn't create a blind spot
// at the window edges.
const LOOKBACK_HOURS = 48;

const RAZORPAY_SUCCESS_STATUSES = new Set(["captured", "refunded"]);
const LOCAL_PAYMENT_SUCCESS_STATUSES = new Set(["captured", "refunded", "partially_refunded"]);

type MismatchResult = ReconciliationMismatch | undefined;

async function recordMismatch(input: InsertReconciliationMismatch): Promise<MismatchResult> {
  const recorded = await storage.recordReconciliationMismatchIfNew(input);
  if (recorded) {
    console.error(`Reconciliation mismatch: ${input.gateway} ${input.gatewayPaymentId} (${input.mismatchType}) gateway=${input.gatewayStatus} local=${input.localStatus}`);
  }
  return recorded;
}

async function reconcileRazorpay(since: Date): Promise<{ checked: number; mismatches: MismatchResult[] }> {
  let razorpay;
  try {
    razorpay = getRazorpayClient();
  } catch {
    return { checked: 0, mismatches: [] }; // Razorpay not configured in this environment
  }

  const fromUnix = Math.floor(since.getTime() / 1000);
  const toUnix = Math.floor(Date.now() / 1000);

  const gatewayPayments: Array<{ id: string; status: string; amount: number }> = [];
  const PAGE_SIZE = 100;
  const MAX_PAGES = 50; // 5,000 payments/day cap — enough headroom, bounds a runaway loop
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await razorpay.payments.all({ from: fromUnix, to: toUnix, count: PAGE_SIZE, skip: page * PAGE_SIZE });
    for (const p of result.items) {
      gatewayPayments.push({ id: p.id, status: p.status, amount: Number(p.amount) / 100 });
    }
    if (result.items.length < PAGE_SIZE) break;
  }
  const gatewayMap = new Map(gatewayPayments.map((p) => [p.id, p]));

  const localBookingPayments = await db.select().from(payments).where(and(eq(payments.gateway, "razorpay"), gte(payments.createdAt, since)));
  const localWalletTx = await db.select().from(walletTransactions).where(gte(walletTransactions.createdAt, since));
  const localBookingByGatewayId = new Map(localBookingPayments.filter((p) => p.gatewayPaymentId).map((p) => [p.gatewayPaymentId as string, p]));
  const localWalletByRazorpayId = new Map(localWalletTx.filter((w) => w.razorpayPaymentId).map((w) => [w.razorpayPaymentId as string, w]));

  const mismatches: MismatchResult[] = [];

  for (const gp of gatewayPayments) {
    const isGatewaySuccess = RAZORPAY_SUCCESS_STATUSES.has(gp.status);
    const localBooking = localBookingByGatewayId.get(gp.id);
    const localWallet = localWalletByRazorpayId.get(gp.id);

    if (!localBooking && !localWallet) {
      if (isGatewaySuccess) {
        mismatches.push(await recordMismatch({
          gateway: "razorpay", gatewayPaymentId: gp.id, mismatchType: "missing_locally",
          gatewayStatus: gp.status, localStatus: null, amount: gp.amount.toFixed(2),
          details: { note: "Razorpay shows a successful payment with no matching payments/wallet_transactions row" },
        }));
      }
      continue;
    }

    if (localBooking && isGatewaySuccess !== LOCAL_PAYMENT_SUCCESS_STATUSES.has(localBooking.status)) {
      mismatches.push(await recordMismatch({
        gateway: "razorpay", gatewayPaymentId: gp.id, mismatchType: "status_mismatch",
        gatewayStatus: gp.status, localStatus: localBooking.status, amount: gp.amount.toFixed(2),
        details: { sessionId: localBooking.sessionId },
      }));
    }
    if (localWallet && !isGatewaySuccess) {
      mismatches.push(await recordMismatch({
        gateway: "razorpay", gatewayPaymentId: gp.id, mismatchType: "status_mismatch",
        gatewayStatus: gp.status, localStatus: "wallet_credited", amount: gp.amount.toFixed(2),
        details: { walletTransactionId: localWallet.id },
      }));
    }
  }

  // Reverse direction: local rows claiming success that the gateway batch
  // above didn't confirm. Double-checked with a direct fetch (rather than
  // trusting the window/pagination) before flagging, since a legitimate
  // clock-skew miss here would otherwise be a false alarm every single day.
  for (const lp of localBookingPayments) {
    if (!lp.gatewayPaymentId || !LOCAL_PAYMENT_SUCCESS_STATUSES.has(lp.status) || gatewayMap.has(lp.gatewayPaymentId)) continue;
    try {
      const gp = await razorpay.payments.fetch(lp.gatewayPaymentId);
      if (!RAZORPAY_SUCCESS_STATUSES.has(gp.status)) {
        mismatches.push(await recordMismatch({
          gateway: "razorpay", gatewayPaymentId: lp.gatewayPaymentId, mismatchType: "status_mismatch",
          gatewayStatus: gp.status, localStatus: lp.status, amount: lp.amount,
          details: { sessionId: lp.sessionId },
        }));
      }
    } catch (err) {
      mismatches.push(await recordMismatch({
        gateway: "razorpay", gatewayPaymentId: lp.gatewayPaymentId, mismatchType: "status_mismatch",
        gatewayStatus: "not_found", localStatus: lp.status, amount: lp.amount,
        details: { sessionId: lp.sessionId, error: err instanceof Error ? err.message : String(err) },
      }));
    }
  }
  for (const lw of localWalletTx) {
    if (!lw.razorpayPaymentId || gatewayMap.has(lw.razorpayPaymentId)) continue;
    try {
      const gp = await razorpay.payments.fetch(lw.razorpayPaymentId);
      if (!RAZORPAY_SUCCESS_STATUSES.has(gp.status)) {
        mismatches.push(await recordMismatch({
          gateway: "razorpay", gatewayPaymentId: lw.razorpayPaymentId, mismatchType: "status_mismatch",
          gatewayStatus: gp.status, localStatus: "wallet_credited", amount: lw.amount,
          details: { walletTransactionId: lw.id },
        }));
      }
    } catch (err) {
      mismatches.push(await recordMismatch({
        gateway: "razorpay", gatewayPaymentId: lw.razorpayPaymentId, mismatchType: "status_mismatch",
        gatewayStatus: "not_found", localStatus: "wallet_credited", amount: lw.amount,
        details: { walletTransactionId: lw.id, error: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  return { checked: gatewayPayments.length, mismatches };
}

async function reconcileStripe(since: Date): Promise<{ checked: number; mismatches: MismatchResult[] }> {
  let stripe;
  try {
    stripe = await getUncachableStripeClient();
  } catch {
    return { checked: 0, mismatches: [] }; // Stripe not configured in this environment
  }

  const sinceUnix = Math.floor(since.getTime() / 1000);
  const gatewayIntents: Array<{ id: string; status: string; amount: number }> = [];
  for await (const pi of stripe.paymentIntents.list({ created: { gte: sinceUnix }, limit: 100 })) {
    gatewayIntents.push({ id: pi.id, status: pi.status, amount: pi.amount / 100 });
  }
  const gatewayIds = new Set(gatewayIntents.map((pi) => pi.id));

  const localWalletTx = await db.select().from(walletTransactions).where(gte(walletTransactions.createdAt, since));
  const localByStripeId = new Map(localWalletTx.filter((w) => w.stripePaymentId).map((w) => [w.stripePaymentId as string, w]));

  const mismatches: MismatchResult[] = [];

  for (const pi of gatewayIntents) {
    const isSuccess = pi.status === "succeeded";
    const local = localByStripeId.get(pi.id);
    if (!local) {
      if (isSuccess) {
        mismatches.push(await recordMismatch({
          gateway: "stripe", gatewayPaymentId: pi.id, mismatchType: "missing_locally",
          gatewayStatus: pi.status, localStatus: null, amount: pi.amount.toFixed(2),
          details: { note: "Stripe shows a succeeded payment intent with no matching wallet_transactions row" },
        }));
      }
      continue;
    }
    if (!isSuccess) {
      mismatches.push(await recordMismatch({
        gateway: "stripe", gatewayPaymentId: pi.id, mismatchType: "status_mismatch",
        gatewayStatus: pi.status, localStatus: "wallet_credited", amount: pi.amount.toFixed(2),
        details: { walletTransactionId: local.id },
      }));
    }
  }

  // Reverse direction, same reasoning as the Razorpay pass — confirm with a
  // direct retrieve before flagging so a batch/window miss isn't a false alarm.
  for (const lw of localWalletTx) {
    if (!lw.stripePaymentId || gatewayIds.has(lw.stripePaymentId)) continue;
    try {
      const pi = await stripe.paymentIntents.retrieve(lw.stripePaymentId);
      if (pi.status !== "succeeded") {
        mismatches.push(await recordMismatch({
          gateway: "stripe", gatewayPaymentId: lw.stripePaymentId, mismatchType: "status_mismatch",
          gatewayStatus: pi.status, localStatus: "wallet_credited", amount: lw.amount,
          details: { walletTransactionId: lw.id },
        }));
      }
    } catch (err) {
      mismatches.push(await recordMismatch({
        gateway: "stripe", gatewayPaymentId: lw.stripePaymentId, mismatchType: "status_mismatch",
        gatewayStatus: "not_found", localStatus: "wallet_credited", amount: lw.amount,
        details: { walletTransactionId: lw.id, error: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  return { checked: gatewayIntents.length, mismatches };
}

export async function runReconciliation(): Promise<{ razorpayChecked: number; stripeChecked: number; newMismatches: number }> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  let razorpayResult: { checked: number; mismatches: MismatchResult[] } = { checked: 0, mismatches: [] };
  try {
    razorpayResult = await reconcileRazorpay(since);
  } catch (err) {
    console.error("Reconciliation: Razorpay pass failed", err);
  }

  let stripeResult: { checked: number; mismatches: MismatchResult[] } = { checked: 0, mismatches: [] };
  try {
    stripeResult = await reconcileStripe(since);
  } catch (err) {
    console.error("Reconciliation: Stripe pass failed", err);
  }

  const newMismatches = [...razorpayResult.mismatches, ...stripeResult.mismatches].filter((m): m is ReconciliationMismatch => !!m);
  if (newMismatches.length > 0) {
    await sendReconciliationAlertEmail(newMismatches.map((m) => ({
      gateway: m.gateway,
      gatewayPaymentId: m.gatewayPaymentId,
      mismatchType: m.mismatchType,
      gatewayStatus: m.gatewayStatus,
      localStatus: m.localStatus,
      amount: m.amount,
    })));
  }

  console.log(`Reconciliation run complete: ${razorpayResult.checked} Razorpay + ${stripeResult.checked} Stripe records checked, ${newMismatches.length} new mismatch(es).`);
  return { razorpayChecked: razorpayResult.checked, stripeChecked: stripeResult.checked, newMismatches: newMismatches.length };
}
