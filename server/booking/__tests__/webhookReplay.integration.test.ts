import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Proves the actual DB-level idempotency behind webhook redelivery handling:
// recordWebhookEventIfNew relies on the UQ_webhook_events_gateway_event_id
// unique constraint, not just an app-level pre-check, to make replaying the
// same gateway event a no-op. Same opt-in-only reasoning as
// walletConcurrency.integration.test.ts — this touches the real DB, so it
// must never run as part of the default `npm test` / CI.
//
// Run with:  RUN_INTEGRATION_TESTS=1 npx vitest run server/booking/__tests__/webhookReplay.integration.test.ts
const RUN = process.env.RUN_INTEGRATION_TESTS === "1";

describe.skipIf(!RUN)("webhook replay — event-ID idempotency (real DB)", () => {
  let storage: typeof import("../../storage")["storage"];
  let db: typeof import("../../db")["db"];
  let webhookEvents: typeof import("@shared/schema")["webhookEvents"];
  let eq: typeof import("drizzle-orm")["eq"];

  const runMarker = `webhook-replay-test-${Date.now()}`;
  const createdIds: string[] = [];

  beforeAll(async () => {
    await import("dotenv/config");
    ({ storage } = await import("../../storage"));
    ({ db } = await import("../../db"));
    ({ webhookEvents } = await import("@shared/schema"));
    ({ eq } = await import("drizzle-orm"));
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(webhookEvents).where(eq(webhookEvents.id, id));
    }
  });

  it("logs a new (gateway, eventId) pair and rejects a redelivery of the exact same event", async () => {
    const eventId = `${runMarker}-evt-1`;
    const first = await storage.recordWebhookEventIfNew({
      gateway: "stripe",
      eventId,
      eventType: "checkout.session.completed",
      payload: { note: "first delivery" },
    });
    expect(first).toBeDefined();
    if (first) createdIds.push(first.id);

    // Same gateway + eventId — this is what a Stripe/Razorpay retry (or a
    // dual delivery under normal operation) looks like on the wire.
    const redelivery = await storage.recordWebhookEventIfNew({
      gateway: "stripe",
      eventId,
      eventType: "checkout.session.completed",
      payload: { note: "redelivery" },
    });
    expect(redelivery).toBeUndefined();
  });

  it("treats the same eventId as distinct across different gateways", async () => {
    const sharedEventId = `${runMarker}-shared`;
    const stripeEvent = await storage.recordWebhookEventIfNew({
      gateway: "stripe",
      eventId: sharedEventId,
      eventType: "payment_intent.succeeded",
      payload: {},
    });
    const razorpayEvent = await storage.recordWebhookEventIfNew({
      gateway: "razorpay",
      eventId: sharedEventId,
      eventType: "payment.captured",
      payload: {},
    });

    expect(stripeEvent).toBeDefined();
    expect(razorpayEvent).toBeDefined();
    if (stripeEvent) createdIds.push(stripeEvent.id);
    if (razorpayEvent) createdIds.push(razorpayEvent.id);
  });

  it("marks an event processed, then failed, and both are reflected in getWebhookEvents", async () => {
    const eventId = `${runMarker}-lifecycle`;
    const created = await storage.recordWebhookEventIfNew({
      gateway: "stripe",
      eventId,
      eventType: "charge.dispute.created",
      payload: {},
    });
    expect(created).toBeDefined();
    if (!created) return;
    createdIds.push(created.id);

    await storage.markWebhookEventProcessed(created.id);
    let events = await storage.getWebhookEvents({ status: "processed", limit: 200 });
    expect(events.some((e) => e.id === created.id)).toBe(true);

    await storage.markWebhookEventFailed(created.id, "downstream handler threw");
    events = await storage.getWebhookEvents({ status: "failed", limit: 200 });
    const failedRow = events.find((e) => e.id === created.id);
    expect(failedRow?.error).toBe("downstream handler threw");
  });
});
