import { describe, it, expect } from "vitest";
import type { Refund } from "@shared/schema";
import { applyRefundOutcomes } from "../refundOutcomes";

function makeRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: "refund-1",
    sessionId: "session-1",
    bookingPaymentId: "leg-1",
    fundingSourceType: "gateway",
    amount: "500.00",
    reason: "client_cancelled_within_window",
    initiatedBy: null,
    status: "pending",
    destination: "source",
    gatewayRefundId: null,
    walletTransactionId: null,
    idempotencyKey: "auto_refund:session-1:leg-1",
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

describe("applyRefundOutcomes (reconciles the pre-gateway-call snapshot with what actually happened)", () => {
  it("leaves a refund untouched when no outcome was recorded for it (e.g. a wallet leg, resolved inside the transaction)", () => {
    const walletRefund = makeRefund({ id: "wallet-refund", fundingSourceType: "wallet", status: "succeeded" });
    const result = applyRefundOutcomes([walletRefund], new Map());
    expect(result).toEqual([walletRefund]);
  });

  it("upgrades a pending gateway refund to succeeded when the gateway call completed", () => {
    const pendingRefund = makeRefund({ status: "pending" });
    const outcomes = new Map([["refund-1", { status: "succeeded" as const }]]);

    const [result] = applyRefundOutcomes([pendingRefund], outcomes);
    expect(result.status).toBe("succeeded");
  });

  it("downgrades a pending gateway refund to failed when the gateway call threw — this is the exact bug: a caller previously always saw the pre-attempt 'pending' snapshot, never learning the refund actually failed", () => {
    const pendingRefund = makeRefund({ status: "pending" });
    const outcomes = new Map([["refund-1", { status: "failed" as const, failureReason: "Gateway timeout" }]]);

    const [result] = applyRefundOutcomes([pendingRefund], outcomes);
    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("Gateway timeout");
  });

  it("preserves the original failureReason when an outcome has none", () => {
    const refundWithReason = makeRefund({ status: "pending", failureReason: "Prior attempt note" });
    const outcomes = new Map([["refund-1", { status: "succeeded" as const }]]);

    const [result] = applyRefundOutcomes([refundWithReason], outcomes);
    expect(result.failureReason).toBe("Prior attempt note");
  });

  it("reconciles multiple legs of a split payment independently", () => {
    const succeededLeg = makeRefund({ id: "leg-a", status: "pending" });
    const failedLeg = makeRefund({ id: "leg-b", status: "pending" });
    const outcomes = new Map([
      ["leg-a", { status: "succeeded" as const }],
      ["leg-b", { status: "failed" as const, failureReason: "No captured gateway payment to refund" }],
    ]);

    const result = applyRefundOutcomes([succeededLeg, failedLeg], outcomes);
    expect(result.find((r) => r.id === "leg-a")?.status).toBe("succeeded");
    expect(result.find((r) => r.id === "leg-b")?.status).toBe("failed");
  });

  it("does not mutate the input array", () => {
    const original = makeRefund({ status: "pending" });
    const outcomes = new Map([["refund-1", { status: "succeeded" as const }]]);

    applyRefundOutcomes([original], outcomes);
    expect(original.status).toBe("pending");
  });
});
