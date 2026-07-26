import crypto from "crypto";

// Single source of truth for the session-signing secret, shared by
// express-session (server/auth.ts) and the WebSocket cookie authenticator
// (server/wsAuth.ts). Computed once at module load so both consumers agree
// on the same value regardless of import order.
let secret = process.env.SESSION_SECRET;

if (!secret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  // Generate a random secret for this process instead of a fixed fallback
  // checked into source control, which would let anyone forge sessions.
  secret = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️  WARNING: SESSION_SECRET not set. Using a random per-process secret (existing sessions will be invalidated on restart). Set SESSION_SECRET for a stable, secure value.");
}

export const SESSION_SECRET = secret;
