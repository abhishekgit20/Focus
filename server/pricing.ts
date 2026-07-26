import { db } from "./db";
import { professionalSessionOfferings } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { computeBreakdownFromBase, type PriceBreakdown } from "./lib/pricingMath";

export type { PriceBreakdown };
export { decomposeLockedPrice } from "./lib/pricingMath";

export class OfferingNotFoundError extends Error {
  constructor() {
    super("This professional doesn't offer that session type/duration, or it's currently disabled");
  }
}

// The single source of truth for what a booking costs. Never accept
// price/duration/discount from the client — always re-derive from the
// professional's current offering.
export async function computePricing(
  professionalId: string,
  consultationType: string,
  sessionTemplateId: string,
  discountCode?: string
): Promise<PriceBreakdown> {
  const [offering] = await db
    .select()
    .from(professionalSessionOfferings)
    .where(
      and(
        eq(professionalSessionOfferings.professionalId, professionalId),
        eq(professionalSessionOfferings.consultationType, consultationType),
        eq(professionalSessionOfferings.sessionTemplateId, sessionTemplateId),
        eq(professionalSessionOfferings.enabled, true)
      )
    );

  if (!offering) {
    throw new OfferingNotFoundError();
  }

  // No discount-code system exists yet — this is the extension point.
  // Every code path treats discount as server-computed, never client-supplied.
  return computeBreakdownFromBase(offering.price, "0.00");
}
