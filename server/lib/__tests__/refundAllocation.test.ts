import { describe, it, expect } from "vitest";
import { allocateRefund, RefundExceedsBalanceError, type RefundableLeg } from "../refundAllocation";

function leg(overrides: Partial<RefundableLeg> = {}): RefundableLeg {
  return {
    id: "leg-1",
    fundingSourceType: "wallet",
    amount: "500.00",
    alreadyRefunded: "0",
    ...overrides,
  };
}

describe("allocateRefund (the money-splitting logic behind issuePartialRefund)", () => {
  it("refunds a single wallet leg in full when the amount matches", () => {
    const [alloc] = allocateRefund([leg()], "500.00");
    expect(alloc).toEqual({ legId: "leg-1", fundingSourceType: "wallet", amount: "500.00", legFullyDrained: true });
  });

  it("marks a leg partially drained when the refund amount is less than its balance", () => {
    const [alloc] = allocateRefund([leg({ amount: "500.00" })], "50.00");
    expect(alloc.amount).toBe("50.00");
    expect(alloc.legFullyDrained).toBe(false);
  });

  it("rejects an amount that exceeds the total refundable balance across all legs", () => {
    expect(() => allocateRefund([leg({ amount: "500.00" })], "500.01")).toThrow(RefundExceedsBalanceError);
  });

  it("rejects a zero or negative amount", () => {
    expect(() => allocateRefund([leg()], "0")).toThrow();
    expect(() => allocateRefund([leg()], "-10.00")).toThrow();
  });

  it("accounts for refunds already issued against a leg — a second partial refund only sees what's left", () => {
    const partiallyRefundedLeg = leg({ amount: "500.00", alreadyRefunded: "200.00" });
    const [alloc] = allocateRefund([partiallyRefundedLeg], "300.00");
    expect(alloc.amount).toBe("300.00");
    expect(alloc.legFullyDrained).toBe(true);

    expect(() => allocateRefund([partiallyRefundedLeg], "300.01")).toThrow(RefundExceedsBalanceError);
  });

  it("skips a leg that's already fully refunded", () => {
    const drainedLeg = leg({ id: "drained", amount: "100.00", alreadyRefunded: "100.00" });
    const openLeg = leg({ id: "open", amount: "200.00" });
    const allocations = allocateRefund([drainedLeg, openLeg], "150.00");
    expect(allocations).toHaveLength(1);
    expect(allocations[0].legId).toBe("open");
  });

  it("takes the wallet leg first on a split wallet+gateway booking, spilling into the gateway leg only for what's left", () => {
    const walletLeg = leg({ id: "wallet-leg", fundingSourceType: "wallet", amount: "200.00" });
    const gatewayLeg = leg({ id: "gateway-leg", fundingSourceType: "gateway", amount: "300.00" });

    // Refund less than the wallet leg alone — gateway leg untouched.
    const smallRefund = allocateRefund([gatewayLeg, walletLeg], "150.00");
    expect(smallRefund).toEqual([{ legId: "wallet-leg", fundingSourceType: "wallet", amount: "150.00", legFullyDrained: false }]);

    // Refund spanning both — wallet leg drained first, remainder from gateway.
    const splitRefund = allocateRefund([gatewayLeg, walletLeg], "350.00");
    expect(splitRefund).toEqual([
      { legId: "wallet-leg", fundingSourceType: "wallet", amount: "200.00", legFullyDrained: true },
      { legId: "gateway-leg", fundingSourceType: "gateway", amount: "150.00", legFullyDrained: false },
    ]);
  });

  it("fully drains both legs of a split payment when refunding the full remaining total", () => {
    const walletLeg = leg({ id: "wallet-leg", fundingSourceType: "wallet", amount: "200.00" });
    const gatewayLeg = leg({ id: "gateway-leg", fundingSourceType: "gateway", amount: "300.00" });

    const allocations = allocateRefund([walletLeg, gatewayLeg], "500.00");
    expect(allocations.every((a) => a.legFullyDrained)).toBe(true);
    expect(allocations.reduce((sum, a) => sum + Number(a.amount), 0)).toBeCloseTo(500);
  });
});
