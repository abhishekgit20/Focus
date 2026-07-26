import { describe, it, expect } from "vitest";
import { checkPasswordStrength } from "../passwordPolicy";

describe("checkPasswordStrength", () => {
  it("rejects passwords under 10 characters", () => {
    expect(checkPasswordStrength("Ab1!").valid).toBe(false);
  });

  it("rejects passwords over 128 characters", () => {
    expect(checkPasswordStrength("Aa1!".repeat(40)).valid).toBe(false);
  });

  it("rejects common passwords regardless of case", () => {
    expect(checkPasswordStrength("Password123").valid).toBe(false);
    expect(checkPasswordStrength("PASSWORD123").valid).toBe(false);
  });

  it("rejects passwords with fewer than 3 character classes", () => {
    // all lowercase letters only — 1 class
    expect(checkPasswordStrength("abcdefghijklmnop").valid).toBe(false);
    // letters + digits only — 2 classes
    expect(checkPasswordStrength("abcdefgh12345678").valid).toBe(false);
  });

  it("rejects passwords containing the user's own email local-part", () => {
    const result = checkPasswordStrength("jsmith12345!Aa", "jsmith@example.com");
    expect(result.valid).toBe(false);
  });

  it("accepts a genuinely strong password", () => {
    const result = checkPasswordStrength("Correct-Horse-Battery-9", "someone@example.com");
    expect(result.valid).toBe(true);
  });

  it("is not fooled by a short email local-part substring match", () => {
    // local part "ab" is too short (<=3) to trigger the substring rejection
    const result = checkPasswordStrength("Nothing-To-Do-With-9", "ab@example.com");
    expect(result.valid).toBe(true);
  });
});
