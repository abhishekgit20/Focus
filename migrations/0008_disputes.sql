-- Chargeback/dispute tracking, separate from refunds (which are our own
-- client/professional/admin-initiated flow) — a dispute is raised by the
-- cardholder's bank against us. Additive only — safe to re-run.

CREATE TABLE IF NOT EXISTS disputes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  gateway_dispute_id text NOT NULL,
  gateway_payment_id text,
  session_id varchar REFERENCES sessions(id),
  reason text,
  amount decimal(10, 2),
  status text NOT NULL,
  raw_payload jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_disputes_gateway_dispute_id" ON disputes(gateway, gateway_dispute_id);
CREATE INDEX IF NOT EXISTS "IDX_disputes_session_id" ON disputes(session_id);
CREATE INDEX IF NOT EXISTS "IDX_disputes_status" ON disputes(status);
