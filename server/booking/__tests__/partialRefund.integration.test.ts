import { describe, it, expect, beforeAll, afterAll } from "vitest";

// End-to-end proof of issuePartialRefund against a real wallet-funded
// booking leg: the actual money movement (wallet credit), the idempotency
// guarantee (retrying the same request must not double-credit), and the
// exceeds-balance rejection. The pure allocation math itself (ordering,
// multi-leg splitting) is covered without a DB in
// server/lib/__tests__/refundAllocation.test.ts — this test is specifically
// about the DB-transaction side: does the real wallet balance and
// booking_payments/refunds state end up right. Only exercises a wallet leg
// (no live Razorpay call) to stay self-contained; gateway-leg settlement is
// the same settlePendingGatewayRefunds path already used (and unit-tested
// via refundOutcomes) by refundBooking. Same opt-in-only reasoning as the
// other *.integration.test.ts files in this directory.
//
// Run with:  RUN_INTEGRATION_TESTS=1 npx vitest run server/booking/__tests__/partialRefund.integration.test.ts
const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!RUN)("issuePartialRefund — wallet-leg money movement and idempotency (real DB)", () => {
  let db: typeof import("../../db")["db"];
  let issuePartialRefund: typeof import("../paymentEngine")["issuePartialRefund"];
  let InvalidStateError: typeof import("../paymentEngine")["InvalidStateError"];
  let schema: typeof import("@shared/schema");
  let eq: typeof import("drizzle-orm")["eq"];

  const runMarker = `partial-refund-test-${Date.now()}`;
  let clientId: string;
  let professionalId: string;
  let sessionId: string;
  let walletId: string;
  let bookingPaymentId: string;

  beforeAll(async () => {
    await import("dotenv/config");
    ({ db } = await import("../../db"));
    ({ issuePartialRefund, InvalidStateError } = await import("../paymentEngine"));
    schema = await import("@shared/schema");
    ({ eq } = await import("drizzle-orm"));

    const [client] = await db.insert(schema.users).values({
      email: `${runMarker}-client@test.local`,
      fullName: "DELETE ME — partial refund test client",
      role: "client",
    }).returning();
    clientId = client.id;

    const [professional] = await db.insert(schema.users).values({
      email: `${runMarker}-pro@test.local`,
      fullName: "DELETE ME — partial refund test professional",
      role: "professional",
    }).returning();
    professionalId = professional.id;

    const [wallet] = await db.insert(schema.wallets).values({
      userId: clientId,
      balance: "500.00",
      totalRecharged: "500.00",
    }).returning();
    walletId = wallet.id;

    const [session] = await db.insert(schema.sessions).values({
      clientId,
      professionalId,
      scheduledAt: new Date(),
      type: "chat",
      status: "completed",
      priceAtBooking: "300.00",
      totalCost: "300.00",
    }).returning();
    sessionId = session.id;

    const [originalWalletTxn] = await db.insert(schema.walletTransactions).values({
      walletId,
      type: "payment",
      amount: "300.00",
      description: `Session payment — booking ${sessionId}`,
      sessionId,
    }).returning();

    const [bookingPayment] = await db.insert(schema.bookingPayments).values({
      sessionId,
      fundingSourceType: "wallet",
      fundingSourceId: originalWalletTxn.id,
      amount: "300.00",
      status: "succeeded",
      baseAmount: "300.00",
      totalBookingAmount: "300.00",
    }).returning();
    bookingPaymentId = bookingPayment.id;
  });

  afterAll(async () => {
    if (!sessionId) return;
    await db.delete(schema.paymentAuditLogs).where(eq(schema.paymentAuditLogs.sessionId, sessionId));
    await db.delete(schema.refunds).where(eq(schema.refunds.sessionId, sessionId));
    await db.delete(schema.bookingPayments).where(eq(schema.bookingPayments.sessionId, sessionId));
    await db.delete(schema.walletTransactions).where(eq(schema.walletTransactions.sessionId, sessionId));
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    if (walletId) await db.delete(schema.wallets).where(eq(schema.wallets.id, walletId));
    await db.delete(schema.users).where(eq(schema.users.id, clientId));
    await db.delete(schema.users).where(eq(schema.users.id, professionalId));
  });

  it("credits the wallet and marks the leg partially refunded when the refund is less than the leg total", async () => {
    const before = await db.select().from(schema.wallets).where(eq(schema.wallets.id, walletId));
    const startingBalance = Number(before[0].balance);

    const refunds = await issuePartialRefund(sessionId, "100.00", "service_quality_complaint", professionalId, `${runMarker}-key-1`);

    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe("100.00");
    expect(refunds[0].status).toBe("succeeded");
    expect(refunds[0].destination).toBe("wallet");

    const [wallet] = await db.select().from(schema.wallets).where(eq(schema.wallets.id, walletId));
    expect(Number(wallet.balance)).toBeCloseTo(startingBalance + 100);

    const [leg] = await db.select().from(schema.bookingPayments).where(eq(schema.bookingPayments.id, bookingPaymentId));
    expect(leg.status).toBe("partially_refunded");
  });

  it("is idempotent — retrying the exact same request does not credit the wallet twice", async () => {
    const [before] = await db.select().from(schema.wallets).where(eq(schema.wallets.id, walletId));

    const retryResult = await issuePartialRefund(sessionId, "100.00", "service_quality_complaint", professionalId, `${runMarker}-key-1`);

    const [after] = await db.select().from(schema.wallets).where(eq(schema.wallets.id, walletId));
    expect(after.balance).toBe(before.balance);
    expect(retryResult).toHaveLength(1);
    expect(retryResult[0].amount).toBe("100.00");
  });

  it("fully drains the leg on a second distinct partial refund that exhausts the remaining balance", async () => {
    // 100 already refunded (key-1); leg total is 300, so 200 remains.
    const refunds = await issuePartialRefund(sessionId, "200.00", "second_complaint", professionalId, `${runMarker}-key-2`);
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe("200.00");

    const [leg] = await db.select().from(schema.bookingPayments).where(eq(schema.bookingPayments.id, bookingPaymentId));
    expect(leg.status).toBe("refunded");
  });

  it("rejects a refund request once nothing remains refundable", async () => {
    await expect(
      issuePartialRefund(sessionId, "0.01", "third_complaint", professionalId, `${runMarker}-key-3`)
    ).rejects.toThrow(InvalidStateError);
  });
});
