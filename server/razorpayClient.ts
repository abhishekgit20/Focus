import Razorpay from "razorpay";
import crypto from "crypto";
import { AppError } from "./middleware/errorHandler";

// The razorpay SDK rejects with the raw API error body on failure (e.g.
// { statusCode: 401, error: { description: "..." } }), not an Error
// instance — so err.message/err.stack are undefined and both the server
// log and the client's generic error toast end up with no useful
// information at all. Normalize into a real, actionable error.
function normalizeRazorpayError(err: unknown): never {
  const raw = err as { statusCode?: number; error?: { description?: string; code?: string } };
  const description = raw?.error?.description;
  // Log only the known-safe fields, never the raw err object — if the SDK
  // ever starts rejecting with a full HTTP client error instead of just
  // { statusCode, error }, stringifying it whole would leak the Basic-auth
  // RAZORPAY_KEY_SECRET from the outgoing request config into the logs.
  console.error("Razorpay API call failed:", JSON.stringify({ statusCode: raw?.statusCode, error: raw?.error }));
  throw new AppError(
    502,
    description ? `Payment gateway error: ${description}` : "Payment gateway is unavailable. Please try again shortly.",
    "PAYMENT_GATEWAY_ERROR"
  );
}

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  
  return razorpayInstance;
}

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error("RAZORPAY_KEY_ID not configured");
  }
  return keyId;
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET not configured");
  }

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  try {
    return timingSafeHexEqual(expectedSignature, signature);
  } catch {
    return false; // malformed/non-hex signature — never let a parse error look like success
  }
}

// Server-to-server webhook signature (distinct secret from the API key —
// configured separately in the Razorpay dashboard's webhook settings).
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeHexEqual(expectedSignature, signature);
  } catch {
    return false;
  }
}

export async function createRazorpayOrder(
  amountInPaise: number,
  receipt: string,
  notes: Record<string, string>
) {
  const razorpay = getRazorpayClient();
  try {
    return await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes,
    });
  } catch (err) {
    normalizeRazorpayError(err);
  }
}

export async function createRazorpayRefund(
  paymentId: string,
  amountInPaise: number,
  notes: Record<string, string>
) {
  const razorpay = getRazorpayClient();
  try {
    return await razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
      notes,
    });
  } catch (err) {
    normalizeRazorpayError(err);
  }
}
