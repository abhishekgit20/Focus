import * as money from "./money";

// Pure pricing math — deliberately zero dependency on the DB, so it can be
// unit tested in isolation (mirrors the same split done for role-checking
// middleware in server/security/roleMiddleware.ts).

const DEFAULT_COMMISSION_RATE = 0.15; // platform keeps 15% of the base price, deducted from professional payout
const DEFAULT_GST_RATE = 0.18; // added on top of (base - discount), passed through to the client

export function commissionRate(): number {
  const raw = process.env.PLATFORM_COMMISSION_RATE;
  return raw ? Number(raw) : DEFAULT_COMMISSION_RATE;
}

export function gstRate(): number {
  const raw = process.env.GST_RATE;
  return raw ? Number(raw) : DEFAULT_GST_RATE;
}

export interface PriceBreakdown {
  base: string;
  discount: string;
  tax: string;
  commission: string;
  total: string; // what the client pays: (base - discount) + tax. Commission is NOT added on top — it's deducted from the professional's payout.
}

export function computeBreakdownFromBase(base: string, discount = "0.00"): PriceBreakdown {
  const discountedBase = money.sub(base, discount);
  const tax = money.mul(discountedBase, gstRate());
  const commission = money.mul(discountedBase, commissionRate());
  const total = money.add(discountedBase, tax);
  return { base, discount, tax, commission, total };
}

// Reconstructs the breakdown from a *locked* total (sessions.priceAtBooking)
// rather than re-reading the professional's live offering. This matters
// because the offering's price can change after a slot is reserved but
// before payment completes — the client must be charged exactly the total
// that was quoted at reservation time, decomposed with the same rates, not
// whatever the offering costs right now.
export function decomposeLockedPrice(total: string): PriceBreakdown {
  const rate = gstRate();
  // total = discountedBase * (1 + gstRate)  =>  discountedBase = total / (1 + gstRate)
  const discountedBase = money.mul(total, 1 / (1 + rate));
  const tax = money.sub(total, discountedBase);
  const commission = money.mul(discountedBase, commissionRate());
  return { base: discountedBase, discount: "0.00", tax, commission, total };
}

export interface SplitAmounts {
  walletPortion: string;
  gatewayPortion: string;
}

// The wallet leg is capped at whatever's actually in the wallet — never more
// than the booking total, never negative. Whatever's left goes to the
// gateway. Used both for split-payment orders and to decide whether a
// booking is fully covered by wallet alone (gatewayPortion === "0.00").
export function computeSplit(walletBalance: string, total: string, useWallet: boolean): SplitAmounts {
  const walletPortion = useWallet ? money.min(walletBalance, total) : "0.00";
  const gatewayPortion = money.sub(total, walletPortion);
  return { walletPortion, gatewayPortion };
}
