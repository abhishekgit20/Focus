-- Raw inbound webhook event log — durable idempotency check (gateway,
-- event_id) plus a queryable record of every webhook received, so a
-- processing failure is a visible "failed" row instead of a vanished
-- console.error. Additive only — safe to re-run.

CREATE TABLE IF NOT EXISTS webhook_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL,
  error text,
  received_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_webhook_events_gateway_event_id" ON webhook_events(gateway, event_id);
CREATE INDEX IF NOT EXISTS "IDX_webhook_events_status" ON webhook_events(status);
CREATE INDEX IF NOT EXISTS "IDX_webhook_events_received_at" ON webhook_events(received_at);
