import type { IncomingMessage } from "http";
import cookie from "cookie";
import cookieSignature from "cookie-signature";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { authSessions } from "@shared/schema";
import { storage } from "./storage";
import { SESSION_SECRET } from "./sessionSecret";
import type { User } from "@shared/schema";

const SESSION_COOKIE_NAME = "connect.sid";

// WebSocket upgrades never go through Express's session middleware, so an
// unauthenticated socket would otherwise be able to claim any userId/role it
// likes via query params. This re-derives the real logged-in user from the
// same signed session cookie the REST API trusts, by looking the session id
// up in the same Postgres-backed session store express-session uses.
export async function authenticateUpgradeRequest(req: IncomingMessage): Promise<User | null> {
  try {
    const rawCookie = req.headers.cookie;
    if (!rawCookie) return null;

    const cookies = cookie.parse(rawCookie);
    const signedValue = cookies[SESSION_COOKIE_NAME];
    if (!signedValue || !signedValue.startsWith("s:")) return null;

    const sid = cookieSignature.unsign(signedValue.slice(2), SESSION_SECRET);
    if (!sid) return null; // signature invalid or tampered with

    const [row] = await db.select().from(authSessions).where(eq(authSessions.sid, sid));
    if (!row) return null;
    if (new Date(row.expire).getTime() < Date.now()) return null;

    const sess = row.sess as { passport?: { user?: string } } | null;
    const userId = sess?.passport?.user;
    if (!userId) return null;

    const user = await storage.getUser(userId);
    return user || null;
  } catch (error) {
    console.error("WebSocket auth error:", error);
    return null;
  }
}
