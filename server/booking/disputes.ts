import { db } from "../db";
import { payments, paymentAuditLogs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { sendDisputeAlertEmail } from "../emailService";
import { isUniqueViolation } from "../lib/dbErrors";

export interface DisputeInput {
  gateway: "stripe" | "razorpay";
  gatewayDisputeId: string;
  gatewayPaymentId: string | null;
  reason: string | null | undefined;
  amount: string;
  status: string;
  raw: Record<string, unknown>;
}

// A dispute is raised by the cardholder's bank against us, not through our
// own cancel/refund flow — it must never be silently dropped even though
// nothing here automates a response. First delivery of a given dispute
// creates the row, flags the booking (if it can be matched via
// gatewayPaymentId), and emails the admin alert address; a later
// status-change delivery for the same dispute (won/lost/closed) just
// updates the existing row — no repeat email per transition.
export async function flagDispute(input: DisputeInput): Promise<void> {
  let sessionId: string | null = null;
  if (input.gatewayPaymentId) {
    const [paymentRow] = await db.select().from(payments).where(eq(payments.gatewayPaymentId, input.gatewayPaymentId));
    sessionId = paymentRow?.sessionId ?? null;
  }

  const existing = await storage.getDisputeByGatewayId(input.gateway, input.gatewayDisputeId);
  if (existing) {
    await storage.updateDisputeStatus(existing.id, input.status, input.raw);
    console.log(`Dispute ${input.gatewayDisputeId} (${input.gateway}) updated to status ${input.status}`);
    return;
  }

  try {
    await storage.createDispute({
      gateway: input.gateway,
      gatewayDisputeId: input.gatewayDisputeId,
      gatewayPaymentId: input.gatewayPaymentId,
      sessionId,
      reason: input.reason ?? null,
      amount: input.amount,
      status: input.status,
      rawPayload: input.raw,
    });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      // Concurrent delivery of the same new dispute — the other one already
      // created the row and (about to) send the alert; nothing more to do.
      return;
    }
    throw err;
  }

  await db.insert(paymentAuditLogs).values({
    sessionId,
    actorType: "gateway_webhook",
    action: "dispute_opened",
    amount: input.amount,
    metadata: { gateway: input.gateway, gatewayDisputeId: input.gatewayDisputeId, reason: input.reason ?? null },
  });

  await sendDisputeAlertEmail({
    gateway: input.gateway,
    gatewayDisputeId: input.gatewayDisputeId,
    sessionId,
    reason: input.reason ?? null,
    amount: input.amount,
    status: input.status,
  }).catch((err) => console.error("Failed to send dispute alert email:", err));
}
