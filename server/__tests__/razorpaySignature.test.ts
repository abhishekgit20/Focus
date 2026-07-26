import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "../razorpayClient";

describe("verifyPaymentSignature (checkout callback HMAC)", () => {
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
  });
  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });

  function sign(orderId: string, paymentId: string): string {
    return crypto.createHmac("sha256", "test_key_secret").update(`${orderId}|${paymentId}`).digest("hex");
  }

  it("accepts a correctly signed order|payment pair", () => {
    const signature = sign("order_1", "pay_1");
    expect(verifyPaymentSignature("order_1", "pay_1", signature)).toBe(true);
  });

  it("rejects a signature computed for a different payment id (replay across bookings)", () => {
    const signature = sign("order_1", "pay_1");
    expect(verifyPaymentSignature("order_1", "pay_2", signature)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const signature = sign("order_1", "pay_1");
    const tampered = signature.slice(0, -1) + (signature.at(-1) === "0" ? "1" : "0");
    expect(verifyPaymentSignature("order_1", "pay_1", tampered)).toBe(false);
  });

  it("rejects a malformed/non-hex signature instead of throwing", () => {
    expect(verifyPaymentSignature("order_1", "pay_1", "not-a-valid-signature")).toBe(false);
  });
});

describe("verifyWebhookSignature (server-to-server whole-payload HMAC)", () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
  });
  afterEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
  });

  function sign(body: string): string {
    return crypto.createHmac("sha256", "test_webhook_secret").update(body).digest("hex");
  }

  it("accepts a correctly signed webhook payload", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a payload that doesn't match its signature", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const otherBody = JSON.stringify({ event: "payment.failed" });
    expect(verifyWebhookSignature(body, sign(otherBody))).toBe(false);
  });

  it("rejects a malformed signature instead of throwing", () => {
    expect(verifyWebhookSignature("{}", "garbage")).toBe(false);
  });
});
