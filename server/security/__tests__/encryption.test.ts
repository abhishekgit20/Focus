import { describe, it, expect } from "vitest";
import { encryptField, decryptField } from "../encryption";

describe("encryptField / decryptField", () => {
  it("round-trips a value correctly", () => {
    const plaintext = "JBSWY3DPEHPK3PXP"; // looks like a TOTP secret
    const encrypted = encryptField(plaintext);
    expect(decryptField(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "same-input-every-time";
    const a = encryptField(plaintext);
    const b = encryptField(plaintext);
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(plaintext);
    expect(decryptField(b)).toBe(plaintext);
  });

  it("does not store the plaintext anywhere in the encrypted payload", () => {
    const plaintext = "super-secret-totp-seed";
    const encrypted = encryptField(plaintext);
    expect(encrypted).not.toContain(plaintext);
  });

  it("rejects a tampered payload instead of silently returning wrong data", () => {
    const encrypted = encryptField("original-value");
    const [iv, tag, data] = encrypted.split(":");
    // Flip a character in the ciphertext — GCM's auth tag must catch this.
    const tamperedData = data.slice(0, -2) + (data.slice(-2) === "00" ? "01" : "00");
    const tampered = [iv, tag, tamperedData].join(":");
    expect(() => decryptField(tampered)).toThrow();
  });

  it("throws on a malformed payload rather than crashing unpredictably", () => {
    expect(() => decryptField("not-a-valid-payload")).toThrow();
  });
});
