import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Regression test for a real, launch-blocking bug: the client-facing booking
// UI displayed a professional's raw base price (pre-GST), while
// session.priceAtBooking — the amount actually reserved and debited moments
// later — is the GST-inclusive total. A client shown "₹200" who recharged
// their wallet with exactly ₹200 could be blocked at payment for ~₹236.
//
// The fix wasn't a rounding tweak — it's the invariant this test asserts:
// once reserveSlot() locks a price, every later step (wallet debit, booking
// payment record, invoice) must read that exact same stored value, never
// recompute a fresh one. This test proves that end-to-end through the real
// functions (reserveSlot -> payFullyFromWallet -> getOrCreateInvoice), not
// by asserting each was "correctly computed" in isolation, which is exactly
// how two independently-correct formulas can still drift apart.
//
// Run with:  RUN_INTEGRATION_TESTS=1 npx vitest run server/booking/__tests__/priceConsistency.integration.test.ts
const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!RUN)("Booking price consistency (real DB)", () => {
  let db: typeof import("../../db")["db"];
  let reserveSlot: typeof import("../paymentEngine")["reserveSlot"];
  let payFullyFromWallet: typeof import("../paymentEngine")["payFullyFromWallet"];
  let getOrCreateInvoice: typeof import("../invoice")["getOrCreateInvoice"];
  let computeBreakdownFromBase: typeof import("../../lib/pricingMath")["computeBreakdownFromBase"];
  let schema: typeof import("@shared/schema");
  let eq: typeof import("drizzle-orm")["eq"];

  const runMarker = `price-consistency-test-${Date.now()}`;
  const BASE_PRICE = "200.00";
  // A duration unlikely to collide with the real seeded catalog (15/30/45/60/90).
  const TEST_DURATION_MINUTES = 51234;

  let clientId: string;
  let professionalId: string;
  let sessionTemplateId: string;
  let sessionId: string;

  beforeAll(async () => {
    await import("dotenv/config");
    ({ db } = await import("../../db"));
    ({ reserveSlot, payFullyFromWallet } = await import("../paymentEngine"));
    ({ getOrCreateInvoice } = await import("../invoice"));
    ({ computeBreakdownFromBase } = await import("../../lib/pricingMath"));
    schema = await import("@shared/schema");
    ({ eq } = await import("drizzle-orm"));

    const [client] = await db.insert(schema.users).values({
      email: `${runMarker}-client@test.local`,
      fullName: "DELETE ME — price consistency test client",
      role: "client",
    }).returning();
    clientId = client.id;

    await db.insert(schema.wallets).values({
      userId: clientId,
      balance: "500.00",
      totalRecharged: "500.00",
    });

    const [professional] = await db.insert(schema.users).values({
      email: `${runMarker}-pro@test.local`,
      fullName: "DELETE ME — price consistency test professional",
      role: "professional",
    }).returning();
    professionalId = professional.id;

    await db.insert(schema.professionalProfiles).values({
      userId: professionalId,
      specialization: "Test",
      qualification: "Test",
      experience: 1,
      isAvailable: true,
    });

    const [template] = await db.insert(schema.sessionTemplates).values({
      name: `Test template ${runMarker}`,
      durationMinutes: TEST_DURATION_MINUTES,
    }).returning();
    sessionTemplateId = template.id;

    await db.insert(schema.professionalSessionOfferings).values({
      professionalId,
      consultationType: "chat",
      sessionTemplateId,
      price: BASE_PRICE,
      enabled: true,
    });
  });

  afterAll(async () => {
    if (sessionId) {
      await db.delete(schema.invoices).where(eq(schema.invoices.sessionId, sessionId));
      await db.delete(schema.paymentAuditLogs).where(eq(schema.paymentAuditLogs.sessionId, sessionId));
      await db.delete(schema.bookingPayments).where(eq(schema.bookingPayments.sessionId, sessionId));
      await db.delete(schema.walletTransactions).where(eq(schema.walletTransactions.sessionId, sessionId));
      await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    }
    if (professionalId) {
      await db.delete(schema.professionalSessionOfferings).where(eq(schema.professionalSessionOfferings.professionalId, professionalId));
      await db.delete(schema.professionalProfiles).where(eq(schema.professionalProfiles.userId, professionalId));
    }
    if (sessionTemplateId) await db.delete(schema.sessionTemplates).where(eq(schema.sessionTemplates.id, sessionTemplateId));
    if (clientId) {
      await db.delete(schema.wallets).where(eq(schema.wallets.userId, clientId));
      await db.delete(schema.users).where(eq(schema.users.id, clientId));
    }
    if (professionalId) await db.delete(schema.users).where(eq(schema.users.id, professionalId));
  });

  it("locks a GST-inclusive price at reservation, not the raw base price", async () => {
    const expectedTotal = computeBreakdownFromBase(BASE_PRICE).total;
    // Sanity check the fixture actually exercises GST, not a no-op formula —
    // if this ever equals BASE_PRICE, GST_RATE was set to 0 and this test
    // would silently stop proving anything.
    expect(expectedTotal).not.toBe(BASE_PRICE);

    const { session, pricing } = await reserveSlot({
      clientId,
      professionalId,
      consultationType: "chat",
      sessionTemplateId,
      mode: "scheduled",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    sessionId = session.id;

    expect(pricing.total).toBe(expectedTotal);
    expect(session.priceAtBooking).toBe(expectedTotal);
  });

  it("debits the wallet, records the booking payment, and generates the invoice against the exact same locked value", async () => {
    const [lockedSession] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
    const lockedPrice = lockedSession.priceAtBooking!;

    const [bookingPayment] = await payFullyFromWallet(sessionId, clientId);
    expect(bookingPayment.amount).toBe(lockedPrice);
    expect(bookingPayment.totalBookingAmount).toBe(lockedPrice);

    const invoice = await getOrCreateInvoice(sessionId);
    expect(invoice.totalAmount).toBe(lockedPrice);

    // The one figure that must never move, read four separate ways across
    // the whole pipeline: what reserveSlot locked, what's still on the
    // session row, what got debited/recorded as the booking payment, and
    // what the invoice shows — literally the same string, not four
    // independently-correct computations.
    expect(new Set([lockedPrice, bookingPayment.amount, bookingPayment.totalBookingAmount, invoice.totalAmount]).size).toBe(1);
  }, 20000);
});
