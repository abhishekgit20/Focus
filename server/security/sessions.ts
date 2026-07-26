import { sql } from "drizzle-orm";
import { db } from "../db";
import { authSessions } from "@shared/schema";

// connect-pg-simple stores each session as a JSONB blob; passport nests the
// logged-in user id at sess.passport.user. Deleting by that path is how we
// force-expire every session for an account — used on password reset/change,
// MFA disable, and account deletion, so a stolen session cookie doesn't
// survive the user taking back control of their account.
export async function invalidateAllUserSessions(userId: string, exceptSid?: string): Promise<void> {
  if (exceptSid) {
    await db.delete(authSessions).where(
      sql`${authSessions.sess}->'passport'->>'user' = ${userId} AND ${authSessions.sid} != ${exceptSid}`
    );
  } else {
    await db.delete(authSessions).where(
      sql`${authSessions.sess}->'passport'->>'user' = ${userId}`
    );
  }
}
