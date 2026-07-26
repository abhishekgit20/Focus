-- Defense-in-depth against double-paying a professional for the same
-- session — the application-level guard against double-finalizing session
-- billing (server/realtime.ts) is an in-process check, not a DB
-- transaction, so it isn't provably safe across a server restart or
-- multiple instances. Additive only — safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_earnings_session_id" ON earnings(session_id);
