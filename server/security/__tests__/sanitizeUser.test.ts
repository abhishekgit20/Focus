import { describe, it, expect } from "vitest";
import { sanitizeUser } from "../sanitizeUser";
import type { User } from "@shared/schema";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "person@example.com",
    password: "$argon2id$super-secret-hash",
    role: "professional",
    fullName: "Test Person",
    firstName: null,
    lastName: null,
    phone: null,
    gender: null,
    profileImage: null,
    emailVerified: true,
    emailVerificationTokenHash: "leaked-token-hash",
    emailVerificationExpiry: null,
    passwordResetTokenHash: "leaked-reset-hash",
    passwordResetExpiry: null,
    lastPasswordChangeAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: true,
    mfaSecretEncrypted: "leaked-encrypted-secret",
    mfaBackupCodeHashes: ["leaked-hash-1", "leaked-hash-2"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("sanitizeUser (fixes the public-professionals password/MFA-secret leak)", () => {
  it("strips password, MFA secret, backup code hashes, and token hashes", () => {
    const safe = sanitizeUser(makeUser());

    expect("password" in safe).toBe(false);
    expect("mfaSecretEncrypted" in safe).toBe(false);
    expect("mfaBackupCodeHashes" in safe).toBe(false);
    expect("emailVerificationTokenHash" in safe).toBe(false);
    expect("passwordResetTokenHash" in safe).toBe(false);
  });

  it("keeps non-sensitive, useful fields intact", () => {
    const safe = sanitizeUser(makeUser());

    expect(safe.id).toBe("user-1");
    expect(safe.email).toBe("person@example.com");
    expect(safe.fullName).toBe("Test Person");
    expect(safe.role).toBe("professional");
    expect(safe.mfaEnabled).toBe(true);
  });

  it("never leaks a secret value through JSON.stringify either", () => {
    const safe = sanitizeUser(makeUser());
    const json = JSON.stringify(safe);

    expect(json).not.toContain("leaked-token-hash");
    expect(json).not.toContain("leaked-reset-hash");
    expect(json).not.toContain("leaked-encrypted-secret");
    expect(json).not.toContain("leaked-hash-1");
    expect(json).not.toContain("super-secret-hash");
  });
});
