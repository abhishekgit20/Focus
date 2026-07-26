import { describe, it, expect } from "vitest";
import { istMidnightUtcInstant, istDayOfWeek } from "../istDate";

describe("istMidnightUtcInstant (business-timezone day boundary, not the server's local clock)", () => {
  it("converts an IST calendar date to the correct UTC instant (IST is UTC+5:30)", () => {
    // Midnight IST on Jan 16 is 18:30 UTC on Jan 15 — the exact conversion a
    // UTC-clocked production server previously got wrong by doing this math
    // with Date's local getDay()/setHours() instead.
    expect(istMidnightUtcInstant("2026-01-16").toISOString()).toBe("2026-01-15T18:30:00.000Z");
  });

  it("a full IST day spans exactly 24 hours starting at the returned instant", () => {
    const start = istMidnightUtcInstant("2026-06-01");
    const nextDayStart = istMidnightUtcInstant("2026-06-02");
    expect(nextDayStart.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("rejects a non-YYYY-MM-DD input rather than silently misparsing it", () => {
    expect(() => istMidnightUtcInstant("2026-06-01T00:00:00.000Z")).toThrow();
    expect(() => istMidnightUtcInstant("06/01/2026")).toThrow();
  });
});

describe("istDayOfWeek (derived from the Y/M/D string, never from calling getDay() on an instant)", () => {
  it("matches the real IST calendar weekday, not the UTC weekday of the shifted instant", () => {
    // 2026-01-16 is a Friday (5). The UTC instant for IST midnight of that
    // day (Jan 15, 18:30 UTC) falls on a Thursday (4) — if a day-of-week had
    // ever been read off that shifted instant directly, it would resolve to
    // the wrong weekday and look up the wrong day's working hours.
    expect(istDayOfWeek("2026-01-16")).toBe(5);
    expect(istMidnightUtcInstant("2026-01-16").getUTCDay()).toBe(4);
  });

  it("agrees with Date.UTC's weekday for the same Y/M/D", () => {
    expect(istDayOfWeek("2026-06-01")).toBe(1); // Monday
  });
});
