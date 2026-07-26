import { describe, it, expect, vi, afterEach } from "vitest";
import { isHoneypotTriggered, isSubmittedSuspiciouslyFast, verifyCaptcha } from "../botProtection";

describe("isHoneypotTriggered", () => {
  it("flags a filled honeypot field", () => {
    expect(isHoneypotTriggered({ website: "http://spam.example" })).toBe(true);
  });

  it("does not flag a real submission with no honeypot field", () => {
    expect(isHoneypotTriggered({ email: "person@example.com" })).toBe(false);
  });

  it("does not flag an empty honeypot field", () => {
    expect(isHoneypotTriggered({ website: "" })).toBe(false);
  });

  it("handles undefined body without throwing", () => {
    expect(isHoneypotTriggered(undefined)).toBe(false);
  });
});

describe("isSubmittedSuspiciouslyFast", () => {
  it("flags a submit well under the minimum human reaction window", () => {
    const renderedAt = Date.now() - 100; // 100ms ago
    expect(isSubmittedSuspiciouslyFast(renderedAt, 1200)).toBe(true);
  });

  it("does not flag a submit after a realistic delay", () => {
    const renderedAt = Date.now() - 5000;
    expect(isSubmittedSuspiciouslyFast(renderedAt, 1200)).toBe(false);
  });

  it("does not block when no timestamp was provided (backward compatible)", () => {
    expect(isSubmittedSuspiciouslyFast(undefined)).toBe(false);
  });
});

describe("verifyCaptcha", () => {
  const originalSecret = process.env.CAPTCHA_SECRET_KEY;
  const originalUrl = process.env.CAPTCHA_VERIFY_URL;

  afterEach(() => {
    process.env.CAPTCHA_SECRET_KEY = originalSecret;
    process.env.CAPTCHA_VERIFY_URL = originalUrl;
    vi.unstubAllGlobals();
  });

  it("does not block when no CAPTCHA provider is configured", async () => {
    delete process.env.CAPTCHA_SECRET_KEY;
    delete process.env.CAPTCHA_VERIFY_URL;
    expect(await verifyCaptcha("anything")).toBe(true);
  });

  it("rejects a missing token when a provider IS configured", async () => {
    process.env.CAPTCHA_SECRET_KEY = "test-secret";
    process.env.CAPTCHA_VERIFY_URL = "https://captcha.example/verify";
    expect(await verifyCaptcha(undefined)).toBe(false);
  });

  it("fails closed if the verifier is unreachable", async () => {
    process.env.CAPTCHA_SECRET_KEY = "test-secret";
    process.env.CAPTCHA_VERIFY_URL = "https://captcha.example/verify";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    expect(await verifyCaptcha("some-token")).toBe(false);
  });
});
