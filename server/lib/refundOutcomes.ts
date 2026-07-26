import type { Refund } from "@shared/schema";

export interface RefundOutcome {
  status: "succeeded" | "failed";
  failureReason?: string;
}

// The rows a refund transaction returns are a snapshot from before any
// external gateway refund call runs — refundBooking() attempts those calls
// afterward (outside the DB transaction, since an HTTP call to Razorpay has
// no place inside one) and updates the DB with the real result, but the
// original in-memory Refund objects never reflected that. Callers used to
// get back the pre-attempt snapshot regardless of whether the gateway call
// that came after actually succeeded or failed — a caller checking
// `result[0].status` to decide what to tell the user always saw "pending,"
// never "failed," even when refundBooking's own logs showed a failure.
// This reconciles the snapshot with what actually happened, kept as a pure
// function (no DB import) so it stays trivially unit-testable.
export function applyRefundOutcomes(refunds: Refund[], outcomes: Map<string, RefundOutcome>): Refund[] {
  return refunds.map((r) => {
    const outcome = outcomes.get(r.id);
    if (!outcome) return r;
    return { ...r, status: outcome.status, failureReason: outcome.failureReason ?? r.failureReason };
  });
}
