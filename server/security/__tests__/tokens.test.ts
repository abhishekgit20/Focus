import { describe, it, expect } from "vitest";
import { generateSecureToken, hashToken, timingSafeEqualStrings } from "../tokens";

describe("generateSecureToken", () => {
  it("generates tokens of the expected length", () => {
    expect(generateSecureToken(32)).toHaveLength(64); // hex-encoded
  });

  it("never generates the same token twice", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    const token = generateSecureToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateSecureToken())).not.toBe(hashToken(generateSecureToken()));
  });

  it("is not reversible to the original token by casual inspection", () => {
    const token = "a".repeat(64);
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64); // sha256 hex
  });
});

describe("timingSafeEqualStrings", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualStrings("secret-value", "secret-value")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqualStrings("secret-value", "secret-valug")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(() => timingSafeEqualStrings("short", "a-much-longer-string")).not.toThrow();
    expect(timingSafeEqualStrings("short", "a-much-longer-string")).toBe(false);
  });
});
