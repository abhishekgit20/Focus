import crypto from "crypto";
import type { Request } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { knownDevices } from "@shared/schema";

// A coarse, non-tracking fingerprint (IP + User-Agent hash) used only to
// decide whether a login looks like it's from a device we haven't seen for
// this account before, so we can send a heads-up email. Not persisted
// anywhere client-side, not used across users, not used for analytics.
export function fingerprintRequest(req: Request): string {
  const ip = req.ip || "";
  const ua = req.get("user-agent") || "";
  return crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex");
}

// Records the device and returns true the first time it's seen for this user.
export async function recordDeviceAndCheckIfNew(userId: string, fingerprint: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(knownDevices)
    .where(and(eq(knownDevices.userId, userId), eq(knownDevices.fingerprint, fingerprint)));

  if (existing) {
    await db.update(knownDevices).set({ lastSeenAt: new Date() }).where(eq(knownDevices.id, existing.id));
    return false;
  }

  await db.insert(knownDevices).values({ userId, fingerprint });
  return true;
}
