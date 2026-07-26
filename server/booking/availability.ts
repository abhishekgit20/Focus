import { db } from "../db";
import { professionalAvailability, professionalLeave, sessions } from "@shared/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { istMidnightUtcInstant, istDayOfWeek } from "../lib/istDate";

const SLOT_GRANULARITY_MINUTES = 15;

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Computes free start times (ISO strings) for a given IST calendar date and
// requested duration — working hours minus leave minus existing bookings.
// The frontend only displays what this returns; it never invents slots.
// `dateStr` is a plain YYYY-MM-DD calendar date (the day the client's
// calendar UI shows), deliberately not a timezone-bearing instant — see
// server/lib/istDate.ts for why that distinction matters. All day-of-week,
// day-boundary, and "is this slot in the past" math below is done relative
// to IST — never via Date's local getHours()/getDay()/setHours(), which
// reflect the SERVER PROCESS's timezone (UTC in the production Docker
// image), not the business's. Previously this file used those local-clock
// methods directly: a slot the client picked as "tomorrow" in IST could
// resolve to the wrong calendar day and the wrong working-hours window
// whenever the server's TZ didn't happen to match IST.
export async function getAvailableSlots(
  professionalId: string,
  dateStr: string,
  durationMinutes: number
): Promise<string[]> {
  const dayStart = istMidnightUtcInstant(dateStr);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const dayOfWeek = istDayOfWeek(dateStr);

  const [hours] = await db
    .select()
    .from(professionalAvailability)
    .where(
      and(
        eq(professionalAvailability.professionalId, professionalId),
        eq(professionalAvailability.dayOfWeek, dayOfWeek),
        eq(professionalAvailability.enabled, true)
      )
    );
  if (!hours) return [];

  const leaves = await db
    .select()
    .from(professionalLeave)
    .where(
      and(
        eq(professionalLeave.professionalId, professionalId),
        lte(professionalLeave.startDate, dayEnd),
        gte(professionalLeave.endDate, dayStart)
      )
    );
  if (leaves.length > 0) return [];

  const startMinutes = parseTimeToMinutes(hours.startTime);
  const endMinutes = parseTimeToMinutes(hours.endTime);

  const existing = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.professionalId, professionalId),
        gte(sessions.scheduledAt, dayStart),
        lte(sessions.scheduledAt, dayEnd),
        ne(sessions.status, "cancelled")
      )
    );

  // Minutes since IST midnight of this day — derived from the absolute
  // instant, not the server's local clock.
  const busy: Array<[number, number]> = existing.map((s) => {
    const start = Math.round((s.scheduledAt.getTime() - dayStart.getTime()) / 60000);
    const dur = s.plannedDurationMinutes ?? 60;
    return [start, start + dur];
  });

  const nowMinutes = Math.round((Date.now() - dayStart.getTime()) / 60000);
  const isToday = nowMinutes >= 0 && nowMinutes < 24 * 60;

  const slots: string[] = [];
  for (let t = startMinutes; t + durationMinutes <= endMinutes; t += SLOT_GRANULARITY_MINUTES) {
    if (isToday && t <= nowMinutes) continue;
    const overlaps = busy.some(([bs, be]) => t < be && t + durationMinutes > bs);
    if (overlaps) continue;
    slots.push(new Date(dayStart.getTime() + t * 60000).toISOString());
  }
  return slots;
}
