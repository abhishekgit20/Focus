import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Proves the real DB behavior behind the daily reconciliation job's
// dedup/re-open logic (see recordReconciliationMismatchIfNew in
// server/storage.ts and server/reconciliation.ts): a re-run of the job
// shouldn't spam duplicate rows for a mismatch that's still open, but a
// mismatch that recurs *after* being marked resolved must be re-opened, not
// silently swallowed by the unique constraint (which has no status column).
// Same opt-in-only reasoning as the other *.integration.test.ts files here.
//
// Run with:  RUN_INTEGRATION_TESTS=1 npx vitest run server/booking/__tests__/reconciliationMismatch.integration.test.ts
const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!RUN)("reconciliation mismatches — dedup and re-open (real DB)", () => {
  let storage: typeof import("../../storage")["storage"];
  let db: typeof import("../../db")["db"];
  let reconciliationMismatches: typeof import("@shared/schema")["reconciliationMismatches"];
  let eq: typeof import("drizzle-orm")["eq"];

  const runMarker = `reconciliation-test-${Date.now()}`;
  const createdIds: string[] = [];

  beforeAll(async () => {
    await import("dotenv/config");
    ({ storage } = await import("../../storage"));
    ({ db } = await import("../../db"));
    ({ reconciliationMismatches } = await import("@shared/schema"));
    ({ eq } = await import("drizzle-orm"));
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(reconciliationMismatches).where(eq(reconciliationMismatches.id, id));
    }
  });

  it("logs a new mismatch and treats a re-run finding the same still-open mismatch as a no-op", async () => {
    const gatewayPaymentId = `${runMarker}-pay-1`;
    const first = await storage.recordReconciliationMismatchIfNew({
      gateway: "razorpay",
      gatewayPaymentId,
      mismatchType: "missing_locally",
      gatewayStatus: "captured",
      localStatus: null,
      amount: "150.00",
    });
    expect(first).toBeDefined();
    if (first) createdIds.push(first.id);

    // Next day's job run finds the exact same unresolved mismatch again —
    // must not create a second row (would spam the admin alert email daily).
    const rerun = await storage.recordReconciliationMismatchIfNew({
      gateway: "razorpay",
      gatewayPaymentId,
      mismatchType: "missing_locally",
      gatewayStatus: "captured",
      localStatus: null,
      amount: "150.00",
    });
    expect(rerun).toBeUndefined();

    const open = await storage.getReconciliationMismatches({ status: "open", limit: 200 });
    expect(open.filter((m) => m.gatewayPaymentId === gatewayPaymentId)).toHaveLength(1);
  });

  it("re-opens a mismatch that recurs after being marked resolved, instead of silently dropping it", async () => {
    const gatewayPaymentId = `${runMarker}-pay-2`;
    const first = await storage.recordReconciliationMismatchIfNew({
      gateway: "stripe",
      gatewayPaymentId,
      mismatchType: "status_mismatch",
      gatewayStatus: "succeeded",
      localStatus: "wallet_credited",
      amount: "75.00",
    });
    expect(first).toBeDefined();
    if (!first) return;
    createdIds.push(first.id);

    await storage.resolveReconciliationMismatch(first.id);
    const resolved = await storage.getReconciliationMismatches({ status: "resolved", limit: 200 });
    expect(resolved.some((m) => m.id === first.id)).toBe(true);

    // The unique index has no status column, so without special handling
    // this would hit the constraint and be swallowed — exactly the bug this
    // test guards against.
    const recurrence = await storage.recordReconciliationMismatchIfNew({
      gateway: "stripe",
      gatewayPaymentId,
      mismatchType: "status_mismatch",
      gatewayStatus: "not_found",
      localStatus: "wallet_credited",
      amount: "75.00",
    });
    expect(recurrence).toBeDefined();
    expect(recurrence?.id).toBe(first.id); // same row, re-opened rather than a new insert
    expect(recurrence?.status).toBe("open");
    expect(recurrence?.gatewayStatus).toBe("not_found");

    const openAgain = await storage.getReconciliationMismatches({ status: "open", limit: 200 });
    expect(openAgain.some((m) => m.id === first.id)).toBe(true);
  });
});
