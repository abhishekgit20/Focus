import * as money from "./money";

export interface RefundableLeg {
  id: string;
  fundingSourceType: "wallet" | "gateway";
  amount: string; // this leg's total (booking_payments.amount)
  alreadyRefunded: string; // sum of prior pending/processing/succeeded refunds against this leg
}

export interface RefundAllocation {
  legId: string;
  fundingSourceType: "wallet" | "gateway";
  amount: string; // amount to refund from this leg for this request
  legFullyDrained: boolean; // true if this allocation exhausts the leg's remaining refundable balance
}

export class RefundExceedsBalanceError extends Error {
  constructor(public readonly refundableTotal: string) {
    super(`Refund amount exceeds the refundable balance (₹${refundableTotal})`);
  }
}

// Allocates a partial-refund amount across a booking's funding legs, wallet
// legs first (instant, no external call or failure mode) with gateway legs
// absorbing whatever's left (real money movement, needs an external API
// call). Pure — no DB/gateway imports — so the actual money-splitting logic
// used by issuePartialRefund (server/booking/paymentEngine.ts) stays
// unit-testable without a live database.
export function allocateRefund(legs: RefundableLeg[], amount: string): RefundAllocation[] {
  if (!money.isPositive(amount)) {
    throw new Error("Refund amount must be greater than zero");
  }

  const refundableByLeg = new Map(legs.map((l) => [l.id, money.sub(l.amount, l.alreadyRefunded)]));
  const totalRefundable = legs.reduce((sum, l) => money.add(sum, refundableByLeg.get(l.id)!), "0");
  if (money.isGreaterThan(amount, totalRefundable)) {
    throw new RefundExceedsBalanceError(totalRefundable);
  }

  const ordered = [...legs].sort((a) => (a.fundingSourceType === "wallet" ? -1 : 1));
  let remaining = amount;
  const allocations: RefundAllocation[] = [];

  for (const leg of ordered) {
    if (!money.isPositive(remaining)) break;
    const legRefundable = refundableByLeg.get(leg.id)!;
    if (!money.isPositive(legRefundable)) continue;

    const legAmount = money.min(remaining, legRefundable);
    remaining = money.sub(remaining, legAmount);
    const legFullyDrained = !money.isPositive(money.sub(legRefundable, legAmount));

    allocations.push({ legId: leg.id, fundingSourceType: leg.fundingSourceType, amount: legAmount, legFullyDrained });
  }

  return allocations;
}
