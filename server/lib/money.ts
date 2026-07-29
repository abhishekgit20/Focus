import Decimal from "decimal.js";

// All payment arithmetic goes through here. Drizzle round-trips decimal
// columns as strings — every function takes/returns strings so call sites
// never touch a raw JS float, which is unsafe once two split-payment legs
// must sum to *exactly* the booking total.

export function add(a: string | number, b: string | number): string {
  return new Decimal(a).plus(b).toFixed(2);
}

export function sub(a: string | number, b: string | number): string {
  return new Decimal(a).minus(b).toFixed(2);
}

export function mul(a: string | number, b: string | number): string {
  return new Decimal(a).times(b).toFixed(2);
}

export function min(a: string | number, b: string | number): string {
  return Decimal.min(new Decimal(a), new Decimal(b)).toFixed(2);
}

export function isPositive(a: string | number): boolean {
  return new Decimal(a).greaterThan(0);
}

export function isGreaterThanOrEqual(a: string | number, b: string | number): boolean {
  return new Decimal(a).greaterThanOrEqualTo(b);
}

export function isGreaterThan(a: string | number, b: string | number): boolean {
  return new Decimal(a).greaterThan(b);
}

// Rounds to the nearest whole rupee (still returned as a "X.00" string to
// match the decimal(10,2) column convention every money value round-trips
// through). Half rounds up, e.g. 206.50 -> 207.00.
export function roundToWholeRupee(a: string | number): string {
  return new Decimal(a).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function toPaise(rupees: string | number): number {
  return new Decimal(rupees).times(100).toDecimalPlaces(0).toNumber();
}

export function fromPaise(paise: number): string {
  return new Decimal(paise).dividedBy(100).toFixed(2);
}
