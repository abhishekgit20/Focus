// Deterministic idempotency-key builders. Keeping the format in one place
// (rather than inline template strings at each call site) makes it possible
// to lock down and test the exact shape these keys must have — a change here
// silently breaks "safe to retry without a client-supplied key" guarantees.

// A booking is paid for exactly once, so a session+user-scoped key is safe
// to reuse across a client's blind retry (unlike wallet top-up, which
// legitimately allows many recharges and so includes a timestamp instead).
export function bookingPaymentIdempotencyKey(sessionId: string, userId: string): string {
  return `booking_payment:${sessionId}:${userId}`;
}

// One deterministic key per funding leg of a booking, so two concurrent
// refund triggers (e.g. a reject racing a timeout sweep) converge on the
// same key and the second one is a guaranteed no-op via the UNIQUE
// constraint on refunds.idempotency_key.
export function autoRefundIdempotencyKey(sessionId: string, bookingPaymentId: string): string {
  return `auto_refund:${sessionId}:${bookingPaymentId}`;
}
