import type { Request } from "express";
import { db } from "../db";
import { securityEvents } from "@shared/schema";

// Anything that could reveal a secret or private conversation must never
// reach this log — enforced here rather than trusted at each call site.
const FORBIDDEN_METADATA_KEYS = new Set([
  "password", "token", "secret", "apikey", "api_key", "cookie",
  "content", "message", "transcript", "notes", "bio", "mfaSecret",
  "backupCodes", "totalCost", "amount",
]);

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

export type SecurityEventType =
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.account_locked"
  | "auth.logout"
  | "auth.logout_all_devices"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.password_changed"
  | "auth.email_verified"
  | "auth.mfa_enabled"
  | "auth.mfa_disabled"
  | "auth.mfa_challenge_failure"
  | "auth.new_device_login"
  | "authz.forbidden"
  | "abuse.rate_limited"
  | "abuse.honeypot_triggered"
  | "abuse.bot_suspected"
  | "billing.session_completed"
  | "admin.action"
  | "admin.professional_application_submitted"
  | "admin.professional_application_approved"
  | "admin.professional_application_rejected"
  | "admin.professional_suspended"
  | "admin.professional_reactivated"
  | "payment.verification_failed"
  | "websocket.auth_rejected";

// Best-effort, append-only audit log. A logging failure must never break
// the request it's describing, so errors here are swallowed (and reported
// to stderr) rather than propagated.
export async function logSecurityEvent(params: {
  type: SecurityEventType;
  userId?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      userId: params.userId ?? null,
      type: params.type,
      ipAddress: params.req?.ip,
      userAgent: params.req?.get("user-agent"),
      metadata: sanitizeMetadata(params.metadata),
    });
  } catch (error) {
    console.error("Failed to record security event:", error);
  }
}
