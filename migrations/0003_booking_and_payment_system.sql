-- Fixed-duration booking system (replaces per-minute pricing) + modern
-- payment architecture (Pay Now default, wallet optional, split payment).
-- Additive only — safe to re-run. Applied to the live DB via `npm run db:push`
-- (drizzle-kit push); this file documents the resulting DDL, matching the
-- convention established by 0001/0002.

-- ==================== Booking system ====================

ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS instant_session_timeout_seconds integer NOT NULL DEFAULT 60;
-- Deprecated by professional_session_offerings — no longer collected at
-- application time or editable in Settings; made nullable so both flows
-- keep working without it.
ALTER TABLE professional_profiles ALTER COLUMN price_per_minute DROP NOT NULL;
ALTER TABLE professional_applications ALTER COLUMN price_per_minute DROP NOT NULL;

CREATE TABLE IF NOT EXISTS session_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_minutes integer NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_session_offerings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_type text NOT NULL,
  session_template_id varchar NOT NULL REFERENCES session_templates(id),
  price decimal(10,2) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_offerings_prof_type_template" ON professional_session_offerings(professional_id, consultation_type, session_template_id);
CREATE INDEX IF NOT EXISTS "IDX_offerings_professional_id" ON professional_session_offerings(professional_id);
CREATE INDEX IF NOT EXISTS "IDX_offerings_enabled" ON professional_session_offerings(enabled);
DO $$ BEGIN
  ALTER TABLE professional_session_offerings ADD CONSTRAINT "CHK_offerings_price_positive" CHECK (price > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS professional_availability (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_availability_prof_day" ON professional_availability(professional_id, day_of_week);
CREATE INDEX IF NOT EXISTS "IDX_availability_professional_id" ON professional_availability(professional_id);

CREATE TABLE IF NOT EXISTS professional_leave (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  reason text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_leave_professional_id" ON professional_leave(professional_id);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'scheduled';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_template_id varchar REFERENCES session_templates(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS planned_duration_minutes integer;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS price_at_booking decimal(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS respond_by timestamp;
CREATE INDEX IF NOT EXISTS "IDX_sessions_respond_by" ON sessions(respond_by);

-- Slot-conflict prevention. Exact-timestamp uniqueness is sufficient because
-- fixed-duration templates make bookings snap to a discrete grid; the general
-- overlap case (different durations) is additionally checked in the
-- reserveSlot transaction at the application layer.
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sessions_professional_scheduled_slot"
  ON sessions(professional_id, scheduled_at)
  WHERE status NOT IN ('cancelled');

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sessions_professional_active_instant"
  ON sessions(professional_id)
  WHERE mode = 'instant' AND status IN ('payment_pending', 'pending', 'in_progress');

-- ==================== Payment system ====================

CREATE TABLE IF NOT EXISTS payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  session_id varchar NOT NULL REFERENCES sessions(id),
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text NOT NULL,
  gateway_payment_id text,
  amount decimal(10,2) NOT NULL,
  planned_wallet_portion decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  method text,
  signature_verified_at timestamp,
  failure_reason text,
  raw_gateway_response jsonb,
  idempotency_key text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_payments_session_id" ON payments(session_id);
CREATE INDEX IF NOT EXISTS "IDX_payments_user_id" ON payments(user_id);
CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_gateway_order_id" ON payments(gateway_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_gateway_payment_id" ON payments(gateway_payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_idempotency_key" ON payments(idempotency_key);
DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT "CHK_payments_amount_positive" CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT "CHK_payments_wallet_portion_nonneg" CHECK (planned_wallet_portion >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS booking_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar NOT NULL REFERENCES sessions(id),
  funding_source_type text NOT NULL,
  funding_source_id varchar NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  base_amount decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) NOT NULL DEFAULT 0,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  platform_commission_amount decimal(10,2) NOT NULL DEFAULT 0,
  total_booking_amount decimal(10,2) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_booking_payments_session_id" ON booking_payments(session_id);
CREATE INDEX IF NOT EXISTS "IDX_booking_payments_funding_source" ON booking_payments(funding_source_type, funding_source_id);
CREATE INDEX IF NOT EXISTS "IDX_booking_payments_status" ON booking_payments(status);
DO $$ BEGIN
  ALTER TABLE booking_payments ADD CONSTRAINT "CHK_booking_payments_amount_positive" CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE booking_payments ADD CONSTRAINT "CHK_booking_payments_funding_type" CHECK (funding_source_type IN ('wallet','gateway','package_credit'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS refunds (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar NOT NULL REFERENCES sessions(id),
  booking_payment_id varchar NOT NULL REFERENCES booking_payments(id),
  funding_source_type text NOT NULL,
  amount decimal(10,2) NOT NULL,
  reason text NOT NULL,
  initiated_by varchar REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending',
  destination text NOT NULL,
  gateway_refund_id text,
  wallet_transaction_id varchar REFERENCES wallet_transactions(id),
  idempotency_key text NOT NULL,
  failure_reason text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp
);
CREATE INDEX IF NOT EXISTS "IDX_refunds_session_id" ON refunds(session_id);
CREATE INDEX IF NOT EXISTS "IDX_refunds_booking_payment_id" ON refunds(booking_payment_id);
CREATE INDEX IF NOT EXISTS "IDX_refunds_status" ON refunds(status);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_refunds_idempotency_key" ON refunds(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_refunds_gateway_refund_id" ON refunds(gateway_refund_id);
DO $$ BEGIN
  ALTER TABLE refunds ADD CONSTRAINT "CHK_refunds_amount_positive" CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_methods (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_customer_id text,
  gateway_token_id text NOT NULL,
  type text NOT NULL,
  display_brand text,
  last4 text,
  expiry_month integer,
  expiry_year integer,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  last_used_at timestamp
);
CREATE INDEX IF NOT EXISTS "IDX_payment_methods_user_id" ON payment_methods(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payment_methods_gateway_token" ON payment_methods(gateway, gateway_token_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payment_methods_one_default" ON payment_methods(user_id) WHERE is_default = true AND is_active = true;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE TABLE IF NOT EXISTS invoices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  session_id varchar NOT NULL REFERENCES sessions(id),
  user_id varchar NOT NULL REFERENCES users(id),
  issued_at timestamp NOT NULL DEFAULT now(),
  base_amount decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) NOT NULL DEFAULT 0,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  tax_breakdown jsonb,
  platform_commission_amount decimal(10,2) NOT NULL DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'issued',
  pdf_storage_key text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invoices_invoice_number" ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS "IDX_invoices_session_id" ON invoices(session_id);
CREATE INDEX IF NOT EXISTS "IDX_invoices_user_id" ON invoices(user_id);
CREATE INDEX IF NOT EXISTS "IDX_invoices_issued_at" ON invoices(issued_at);

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar REFERENCES sessions(id),
  user_id varchar REFERENCES users(id),
  actor_type text NOT NULL,
  action text NOT NULL,
  payment_id varchar REFERENCES payments(id),
  refund_id varchar REFERENCES refunds(id),
  booking_payment_id varchar REFERENCES booking_payments(id),
  amount decimal(10,2),
  currency text DEFAULT 'INR',
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_payment_audit_logs_session_id" ON payment_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS "IDX_payment_audit_logs_user_id" ON payment_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS "IDX_payment_audit_logs_action" ON payment_audit_logs(action);
CREATE INDEX IF NOT EXISTS "IDX_payment_audit_logs_created_at" ON payment_audit_logs(created_at);

-- wallet_transactions extension: new type values are free-text, no DDL
-- needed for them, but the debit leg gets a DB-enforced idempotency guard —
-- at most one 'payment' (debit) row per booking, since priceAtBooking is
-- locked at reservation time and never re-priced.
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata jsonb;
CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_session_id" ON wallet_transactions(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_transactions_session_payment"
  ON wallet_transactions(session_id) WHERE type = 'payment';
DO $$ BEGIN
  ALTER TABLE wallet_transactions ADD CONSTRAINT "CHK_wallet_transactions_amount_positive" CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed the fixed session-duration catalog (idempotent — ON CONFLICT no-op).
INSERT INTO session_templates (name, duration_minutes, description, sort_order) VALUES
  ('Quick Check-in', 15, 'Follow-up consultation or urgent guidance.', 1),
  ('Standard Session', 30, 'Most common therapy consultation.', 2),
  ('Deep Session', 45, 'Moderate-depth therapy.', 3),
  ('Extended Session', 60, 'Initial consultation or complex cases.', 4),
  ('Couples / Family Session', 90, 'Relationship or family counselling.', 5)
ON CONFLICT (duration_minutes) DO NOTHING;

-- Backfill existing professionals' pricePerMinute into the new offerings
-- model so nobody goes dark (zero offerings) immediately after migration.
-- Seeds all three consultation types at each of the 4 standard templates
-- (not the optional 90-min Couples/Family session) at price = rate * minutes.
INSERT INTO professional_session_offerings (professional_id, consultation_type, session_template_id, price, enabled)
SELECT pp.user_id, ct.consultation_type, st.id, ROUND(pp.price_per_minute * st.duration_minutes, 2), true
FROM professional_profiles pp
CROSS JOIN (VALUES ('chat'), ('audio'), ('video')) AS ct(consultation_type)
CROSS JOIN session_templates st
WHERE st.duration_minutes IN (15, 30, 45, 60)
  AND pp.price_per_minute > 0
ON CONFLICT DO NOTHING;
