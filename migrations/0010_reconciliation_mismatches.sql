-- Findings from the daily gateway-vs-local-DB reconciliation job. Additive
-- only — safe to re-run.

CREATE TABLE IF NOT EXISTS reconciliation_mismatches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  gateway_payment_id text NOT NULL,
  mismatch_type text NOT NULL,
  gateway_status text,
  local_status text,
  amount decimal(10, 2),
  details jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reconciliation_mismatches_unique" ON reconciliation_mismatches(gateway, gateway_payment_id, mismatch_type);
CREATE INDEX IF NOT EXISTS "IDX_reconciliation_mismatches_status" ON reconciliation_mismatches(status);
CREATE INDEX IF NOT EXISTS "IDX_reconciliation_mismatches_created_at" ON reconciliation_mismatches(created_at);
