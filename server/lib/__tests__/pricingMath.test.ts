import { describe, it, expect, afterEach } from "vitest";
import { computeBreakdownFromBase, decomposeLockedPrice } from "../pricingMath";

describe("computeBreakdownFromBase", () => {
  afterEach(() => {
    delete process.env.GST_RATE;
    delete process.env.PLATFORM_COMMISSION_RATE;
  });

  it("rounds a fractional GST-inclusive total to a whole rupee", () => {
    // 175 * 1.18 = 206.50 exactly -> rounds up to 207.
    const { total } = computeBreakdownFromBase("175.00");
    expect(total).toBe("207.00");
  });

  it("rounds down when the fraction is below the half-rupee midpoint", () => {
    // 101 * 1.18 = 119.18 -> rounds down to 119.
    const { total } = computeBreakdownFromBase("101.00");
    expect(total).toBe("119.00");
  });

  it("leaves an already-whole total unchanged", () => {
    // 200 * 1.18 = 236.00 exactly.
    const { total } = computeBreakdownFromBase("200.00");
    expect(total).toBe("236.00");
  });

  it("never produces a total with paise, across a range of base prices", () => {
    for (const base of ["99.00", "150.00", "249.99", "333.33", "1.00", "1000.00"]) {
      const { total } = computeBreakdownFromBase(base);
      expect(total.endsWith(".00")).toBe(true);
    }
  });
});

describe("decomposeLockedPrice reconstructs consistently from a rounded total", () => {
  it("base + tax reproduces the exact locked total, even though it no longer divides evenly by (1 + gstRate)", () => {
    const { total } = computeBreakdownFromBase("175.00"); // "207.00" -- not evenly divisible by 1.18
    const decomposed = decomposeLockedPrice(total);
    expect(decomposed.total).toBe(total);
    // This is the invariant invoices/booking payments actually depend on:
    // base + tax must equal the locked total exactly, to the paisa, however
    // the total was rounded on the way in.
    const reconstructed = (Number(decomposed.base) + Number(decomposed.tax)).toFixed(2);
    expect(reconstructed).toBe(total);
  });
});
