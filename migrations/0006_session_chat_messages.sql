-- Persisted transcript for live-session chat, which previously only existed
-- in-memory in the WebSocket relay (server/realtime.ts) — a refresh, a
-- socket that wasn't open at send time, or reopening the session later lost
-- the entire conversation with no record anywhere. Additive only — safe to
-- re-run.

CREATE TABLE IF NOT EXISTS session_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar NOT NULL REFERENCES sessions(id),
  sender_id varchar NOT NULL REFERENCES users(id),
  sender_role text NOT NULL,
  content text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_session_messages_session_id" ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS "IDX_session_messages_created_at" ON session_messages(created_at);
