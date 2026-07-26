-- Security hardening: email verification, password reset, account lockout,
-- MFA, password history, security event log, known-device tracking.
-- Applied to production on 2026-07-12. Additive only — safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expiry timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expiry timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change_at timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_code_hashes text[];

CREATE TABLE IF NOT EXISTS password_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_password_history_user_id" ON password_history(user_id);

CREATE TABLE IF NOT EXISTS security_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_security_events_user_id" ON security_events(user_id);
CREATE INDEX IF NOT EXISTS "IDX_security_events_type" ON security_events(type);
CREATE INDEX IF NOT EXISTS "IDX_security_events_created_at" ON security_events(created_at);

CREATE TABLE IF NOT EXISTS known_devices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  first_seen_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_known_devices_user_id" ON known_devices(user_id);
