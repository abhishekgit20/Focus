// The business operates in India; India has a single fixed offset with no
// DST, so this never needs to change with the calendar. Kept dependency-free
// (no db.ts import) so it stays trivially unit-testable — see
// server/lib/__tests__/istDate.test.ts.
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Midnight IST of the given calendar date, expressed as the (timezone-
// independent) UTC instant it actually is. Date.UTC is used purely to parse
// the Y/M/D components — it is never treated as a UTC calendar day.
export function istMidnightUtcInstant(dateStr: string): Date {
  const match = DATE_RE.exec(dateStr);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got: ${dateStr}`);
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)) - IST_OFFSET_MS);
}

// Day-of-week (0=Sunday..6=Saturday) of a plain calendar date. Computed from
// the Y/M/D components directly — never from calling getDay()/getUTCDay() on
// an instant, which reflects whatever timezone is doing the asking.
export function istDayOfWeek(dateStr: string): number {
  const match = DATE_RE.exec(dateStr);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got: ${dateStr}`);
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
}
