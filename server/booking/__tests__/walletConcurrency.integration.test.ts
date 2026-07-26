import { describe, it, expect, beforeAll, afterAll } from "vitest";

// This test proves real Postgres row-locking behavior (FOR UPDATE
// serializing two concurrent read-modify-writes on the same wallet row) —
// a mock or in-memory fake can't demonstrate that, only a real database
// can. There's no dedicated test database configured for this project
// (DATABASE_URL points at the actual dev/Supabase instance), so this is
// opt-in only: it creates and deletes real rows and must never run as part
// of the default `npm test` / CI. All imports that would trigger a DB
// connection (server/db.ts connects on import) are deferred into
// beforeAll, which describe.skipIf prevents from ever running unless
// explicitly requested.
//
// Run with:  RUN_INTEGRATION_TESTS=1 npx vitest run server/booking/__tests__/walletConcurrency.integration.test.ts
const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!RUN)("wallet concurrency — concurrent credits to the same wallet (real DB)", () => {
  let storage: typeof import("../../storage")["storage"];
  let db: typeof import("../../db")["db"];
  let users: typeof import("@shared/schema")["users"];
  let wallets: typeof import("@shared/schema")["wallets"];
  let walletTransactions: typeof import("@shared/schema")["walletTransactions"];
  let eq: typeof import("drizzle-orm")["eq"];

  let testUserId: string;
  const STARTING_BALANCE = "100.00";
  const CREDIT_A = "50.00";
  const CREDIT_B = "30.00";
  // Distinct per test run so a failed run's leftover rows never collide
  // with (or get miscounted by) a subsequent run.
  const runMarker = `concurrency-test-${Date.now()}`;

  beforeAll(async () => {
    // vitest doesn't load .env the way `tsx server/index.ts` does (that
    // happens via its own top-level `import "dotenv/config"`) — without
    // this, DATABASE_URL is unset here even though it's in .env.
    await import("dotenv/config");
    ({ storage } = await import("../../storage"));
    ({ db } = await import("../../db"));
    ({ users, wallets, walletTransactions } = await import("@shared/schema"));
    ({ eq } = await import("drizzle-orm"));

    const [user] = await db
      .insert(users)
      .values({
        email: `${runMarker}@test.local`,
        fullName: "DELETE ME — wallet concurrency test",
        role: "client",
      })
      .returning();
    testUserId = user.id;

    await db.insert(wallets).values({ userId: testUserId, balance: STARTING_BALANCE, totalRecharged: STARTING_BALANCE });
  });

  afterAll(async () => {
    if (!testUserId) return;
    // FK order: wallet_transactions -> wallets -> users.
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, testUserId));
    if (wallet) {
      await db.delete(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));
      await db.delete(wallets).where(eq(wallets.id, wallet.id));
    }
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("applies both concurrent credits exactly once each — no lost update", async () => {
    // Fired together, not awaited sequentially — this is the actual race:
    // both requests can read the pre-credit balance before either commits
    // unless the wallet row is locked for the duration of each
    // transaction, which is exactly what creditWalletForGatewayPayment does.
    const [resultA, resultB] = await Promise.all([
      storage.creditWalletForGatewayPayment({
        userId: testUserId,
        amount: CREDIT_A,
        description: "Concurrency test credit A",
        stripePaymentId: `${runMarker}-a`,
      }),
      storage.creditWalletForGatewayPayment({
        userId: testUserId,
        amount: CREDIT_B,
        description: "Concurrency test credit B",
        razorpayPaymentId: `${runMarker}-b`,
      }),
    ]);

    expect(resultA.credited).toBe(true);
    expect(resultB.credited).toBe(true);

    const finalWallet = await storage.getWallet(testUserId);
    const expectedBalance = (Number(STARTING_BALANCE) + Number(CREDIT_A) + Number(CREDIT_B)).toFixed(2);
    // A lost update (no locking) would leave this at 100+50=150 or
    // 100+30=130 depending on which write landed last, never both.
    expect(finalWallet?.balance).toBe(expectedBalance);
  });

  it("rejects a second credit carrying an already-used payment ID (idempotency, not just concurrency)", async () => {
    const duplicateId = `${runMarker}-dup`;
    const first = await storage.creditWalletForGatewayPayment({
      userId: testUserId,
      amount: "10.00",
      description: "First delivery",
      stripePaymentId: duplicateId,
    });
    const second = await storage.creditWalletForGatewayPayment({
      userId: testUserId,
      amount: "10.00",
      description: "Redelivery of the same event",
      stripePaymentId: duplicateId,
    });

    expect(first.credited).toBe(true);
    expect(second.credited).toBe(false);
  });
});
