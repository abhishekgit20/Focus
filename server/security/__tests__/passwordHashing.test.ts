import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword, needsRehash } from "../passwordHashing";

describe("Argon2id / legacy-bcrypt dual password hashing", () => {
  it("hashes new passwords with Argon2id", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-9");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies a password against its own Argon2id hash", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-9");
    expect(await verifyPassword("Correct-Horse-Battery-9", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("still verifies against a legacy bcrypt hash (pre-migration accounts)", async () => {
    const legacyHash = await bcrypt.hash("OldAccountPassword1!", 10);
    expect(await verifyPassword("OldAccountPassword1!", legacyHash)).toBe(true);
    expect(await verifyPassword("wrong-password", legacyHash)).toBe(false);
  });

  it("flags legacy bcrypt hashes for lazy upgrade, not fresh Argon2id ones", async () => {
    const legacyHash = await bcrypt.hash("whatever", 10);
    const modernHash = await hashPassword("whatever");

    expect(needsRehash(legacyHash)).toBe(true);
    expect(needsRehash(modernHash)).toBe(false);
  });
});
