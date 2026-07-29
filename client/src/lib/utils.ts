import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Session prices are already rounded to a whole rupee server-side
// (computeBreakdownFromBase), so this only strips the ".00" a decimal-string
// amount always carries -- it doesn't do any rounding of its own. Real
// money should already be whole by the time it reaches display; this is a
// formatting step, not where correctness comes from.
export function formatRupees(amount: string | number): string {
  return `₹${Math.round(Number(amount))}`;
}
