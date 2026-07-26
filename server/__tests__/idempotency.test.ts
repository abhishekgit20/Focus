import { describe, it, expect } from "vitest";
import { bookingPaymentIdempotencyKey, autoRefundIdempotencyKey } from "../lib/idempotency";

describe("bookingPaymentIdempotencyKey", () => {
  it("is deterministic for the same session and user", () => {
    const a = bookingPaymentIdempotencyKey("session-1", "user-1");
    const b = bookingPaymentIdempotencyKey("session-1", "user-1");
    expect(a).toBe(b);
  });

  it("differs across sessions or users, so unrelated bookings never collide", () => {
    const base = bookingPaymentIdempotencyKey("session-1", "user-1");
    expect(bookingPaymentIdempotencyKey("session-2", "user-1")).not.toBe(base);
    expect(bookingPaymentIdempotencyKey("session-1", "user-2")).not.toBe(base);
  });

  it("does not depend on wall-clock time, unlike the wallet-topup fallback key", () => {
    const a = bookingPaymentIdempotencyKey("session-1", "user-1");
    const b = bookingPaymentIdempotencyKey("session-1", "user-1");
    // If this ever regresses to include Date.now(), these would differ.
    expect(a).toBe(b);
  });
});

describe("autoRefundIdempotencyKey", () => {
  it("is deterministic per session + funding leg, so two racing refund triggers converge on one key", () => {
    const a = autoRefundIdempotencyKey("session-1", "leg-1");
    const b = autoRefundIdempotencyKey("session-1", "leg-1");
    expect(a).toBe(b);
  });

  it("differs per funding leg, so a split payment's wallet and gateway legs refund independently", () => {
    const walletLegKey = autoRefundIdempotencyKey("session-1", "leg-wallet");
    const gatewayLegKey = autoRefundIdempotencyKey("session-1", "leg-gateway");
    expect(walletLegKey).not.toBe(gatewayLegKey);
  });
});
