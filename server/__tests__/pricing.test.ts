import { describe, it, expect } from "vitest";
import { decomposeLockedPrice, computeSplit } from "../lib/pricingMath";

describe("decomposeLockedPrice (reconstructs a booking's breakdown from its locked total)", () => {
  it("decomposes a total back into base + tax at the default 18% GST rate", () => {
    // total = base * 1.18  =>  base = total / 1.18
    const result = decomposeLockedPrice("118.00");
    expect(result.base).toBe("100.00");
    expect(result.tax).toBe("18.00");
    expect(result.total).toBe("118.00");
  });

  it("base + tax always reconstitutes exactly to the original total", () => {
    for (const total of ["600.00", "300.00", "1800.00", "899.50"]) {
      const result = decomposeLockedPrice(total);
      const reconstructed = (Number(result.base) + Number(result.tax)).toFixed(2);
      expect(reconstructed).toBe(total);
    }
  });

  it("commission is computed on the discounted base, not the total", () => {
    const result = decomposeLockedPrice("118.00");
    // default commission rate 15% of base (100.00) = 15.00
    expect(result.commission).toBe("15.00");
  });

  it("discount is always zero for a locked-price decomposition (no discount-code system yet)", () => {
    const result = decomposeLockedPrice("236.00");
    expect(result.discount).toBe("0.00");
  });
});

describe("computeSplit (wallet + gateway split payment calculation)", () => {
  it("splits when wallet balance is insufficient to cover the total", () => {
    const { walletPortion, gatewayPortion } = computeSplit("250.00", "600.00", true);
    expect(walletPortion).toBe("250.00");
    expect(gatewayPortion).toBe("350.00");
  });

  it("caps the wallet portion at the booking total when balance exceeds it", () => {
    const { walletPortion, gatewayPortion } = computeSplit("800.00", "600.00", true);
    expect(walletPortion).toBe("600.00");
    expect(gatewayPortion).toBe("0.00");
  });

  it("routes everything to the gateway when useWallet is false, regardless of balance", () => {
    const { walletPortion, gatewayPortion } = computeSplit("800.00", "600.00", false);
    expect(walletPortion).toBe("0.00");
    expect(gatewayPortion).toBe("600.00");
  });

  it("routes everything to the gateway when the wallet is empty", () => {
    const { walletPortion, gatewayPortion } = computeSplit("0.00", "600.00", true);
    expect(walletPortion).toBe("0.00");
    expect(gatewayPortion).toBe("600.00");
  });

  it("the two legs always sum exactly to the total — the correctness invariant split payment depends on", () => {
    for (const [balance, total] of [["250.00", "600.00"], ["0.01", "899.50"], ["1800.00", "1800.00"], ["17.33", "45.67"]]) {
      const { walletPortion, gatewayPortion } = computeSplit(balance, total, true);
      expect((Number(walletPortion) + Number(gatewayPortion)).toFixed(2)).toBe(total);
    }
  });
});
