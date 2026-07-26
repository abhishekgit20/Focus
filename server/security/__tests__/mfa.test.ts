import { describe, it, expect } from "vitest";
import { authenticator } from "otplib";
import {
  generateTotpSecret,
  encryptTotpSecret,
  verifyTotpToken,
  verifyTotpTokenOnce,
  generateBackupCodes,
  verifyBackupCode,
} from "../mfa";

describe("TOTP enrollment and verification", () => {
  it("accepts a correctly-generated current code", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    const validToken = authenticator.generate(secret);

    expect(verifyTotpToken(validToken, encrypted)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);

    expect(verifyTotpToken("000000", encrypted)).toBe(false);
  });

  it("rejects malformed input instead of throwing", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);

    expect(verifyTotpToken("not-a-code", encrypted)).toBe(false);
    expect(verifyTotpToken("", encrypted)).toBe(false);
  });

  it("a code valid for one user's secret is not valid for another's", () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const tokenForA = authenticator.generate(secretA);

    expect(verifyTotpToken(tokenForA, encryptTotpSecret(secretB))).toBe(false);
  });
});

describe("TOTP replay protection", () => {
  it("accepts a fresh code with no prior usage recorded", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    const token = authenticator.generate(secret);

    const result = verifyTotpTokenOnce(token, encrypted, null);
    expect(result.valid).toBe(true);
    expect(result.step).not.toBeNull();
  });

  it("rejects replaying the same code against its own just-recorded step", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    const token = authenticator.generate(secret);

    const first = verifyTotpTokenOnce(token, encrypted, null);
    expect(first.valid).toBe(true);

    const replay = verifyTotpTokenOnce(token, encrypted, first.step);
    expect(replay.valid).toBe(false);
  });

  it("rejects an otherwise-valid code whose step is not after lastUsedStep", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    const token = authenticator.generate(secret);

    // Simulate a lastUsedStep far in the future (already-consumed window).
    const result = verifyTotpTokenOnce(token, encrypted, Number.MAX_SAFE_INTEGER);
    expect(result.valid).toBe(false);
  });

  it("still rejects an incorrect code regardless of lastUsedStep", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);

    expect(verifyTotpTokenOnce("000000", encrypted, null).valid).toBe(false);
  });
});

describe("Backup codes", () => {
  it("generates 8 unique codes with matching hashes", async () => {
    const { codes, hashes } = await generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(hashes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });

  it("verifies a valid backup code and removes it from the pool (single use)", async () => {
    const { codes, hashes } = await generateBackupCodes();
    const result = await verifyBackupCode(codes[0], hashes);

    expect(result.valid).toBe(true);
    expect(result.remainingHashes).toHaveLength(7);

    // The same code must not work a second time against the updated pool.
    const secondAttempt = await verifyBackupCode(codes[0], result.remainingHashes);
    expect(secondAttempt.valid).toBe(false);
  });

  it("rejects a code that was never issued", async () => {
    const { hashes } = await generateBackupCodes();
    const result = await verifyBackupCode("0000000000", hashes);
    expect(result.valid).toBe(false);
    expect(result.remainingHashes).toHaveLength(hashes.length);
  });
});
