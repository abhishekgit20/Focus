-- TOTP replay protection: track the last accepted time-step per user so an
-- intercepted-but-still-valid code (otplib's default verify() tolerates
-- +/-1 step of clock drift, i.e. up to ~90s) can't be replayed a second time.
-- Additive only — safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used_step integer;
