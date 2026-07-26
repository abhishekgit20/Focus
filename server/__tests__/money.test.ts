import { describe, it, expect } from "vitest";
import { add, sub, mul, min, isPositive, isGreaterThanOrEqual, toPaise, fromPaise } from "../lib/money";

describe("money helpers (decimal-safe arithmetic)", () => {
  it("adds two decimal strings without float drift", () => {
    expect(add("0.1", "0.2")).toBe("0.30");
    expect(add("100.50", "49.50")).toBe("150.00");
  });

  it("subtracts two decimal strings", () => {
    expect(sub("600.00", "250.00")).toBe("350.00");
    expect(sub("10.10", "10.10")).toBe("0.00");
  });

  it("multiplies a decimal string by a rate", () => {
    expect(mul("600.00", 0.15)).toBe("90.00");
    expect(mul("100.00", 0.18)).toBe("18.00");
  });

  it("min returns the smaller of two decimal amounts", () => {
    expect(min("250.00", "600.00")).toBe("250.00");
    expect(min("600.00", "250.00")).toBe("250.00");
  });

  it("isPositive is strictly greater than zero", () => {
    expect(isPositive("0.01")).toBe(true);
    expect(isPositive("0.00")).toBe(false);
    expect(isPositive("-5.00")).toBe(false);
  });

  it("isGreaterThanOrEqual compares decimal strings correctly", () => {
    expect(isGreaterThanOrEqual("600.00", "600.00")).toBe(true);
    expect(isGreaterThanOrEqual("600.01", "600.00")).toBe(true);
    expect(isGreaterThanOrEqual("599.99", "600.00")).toBe(false);
  });

  it("toPaise converts rupees to integer paise", () => {
    expect(toPaise("600.00")).toBe(60000);
    expect(toPaise("1.50")).toBe(150);
    expect(toPaise(0)).toBe(0);
  });

  it("fromPaise converts integer paise back to a rupee string", () => {
    expect(fromPaise(60000)).toBe("600.00");
    expect(fromPaise(150)).toBe("1.50");
  });

  it("round-trips toPaise/fromPaise without drift for typical booking amounts", () => {
    for (const amount of ["15.00", "300.00", "600.00", "899.50", "1800.00"]) {
      expect(fromPaise(toPaise(amount))).toBe(amount);
    }
  });
});
