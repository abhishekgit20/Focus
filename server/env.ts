// Environment variable validation for production readiness
import { z } from "zod";

const envSchema = z.object({
  // Required in all environments
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  
  // Optional but recommended
  BASE_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  // Enforced separately (fail-fast on import) by server/security/encryption.ts
  // and the /metrics auth check in server/index.ts respectively — listed
  // here mainly so they show up in .env.example-style tooling.
  FIELD_ENCRYPTION_KEY: z.string().optional(),
  METRICS_TOKEN: z.string().optional(),
  CAPTCHA_SECRET_KEY: z.string().optional(),
  CAPTCHA_VERIFY_URL: z.string().url().optional(),
  
  // Payment providers (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Booking/payment engine (optional, sensible defaults applied where read)
  PLATFORM_COMMISSION_RATE: z.string().regex(/^0(\.\d+)?$/).optional(), // fraction, e.g. '0.15' = 15%
  GST_RATE: z.string().regex(/^0(\.\d+)?$/).optional(), // fraction, e.g. '0.18' = 18%
  PAYMENT_RESERVATION_TTL_MS: z.string().regex(/^\d+$/).optional(),
  CANCELLATION_WINDOW_HOURS: z.string().regex(/^\d+$/).optional(),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // AI services (optional)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Crisis alert emails (optional)
  RESEND_API_KEY: z.string().optional(),
  CRISIS_ALERT_EMAIL: z.string().optional(),
  CRISIS_ALERT_FROM_EMAIL: z.string().optional(),

  // WebRTC TURN relay for voice/video sessions (optional — calls fall back to
  // STUN-only, which works on most home networks but fails behind symmetric
  // NATs/restrictive firewalls without it). From a Cloudflare Calls TURN app:
  // dash.cloudflare.com -> Calls -> TURN.
  CLOUDFLARE_TURN_KEY_ID: z.string().optional(),
  CLOUDFLARE_TURN_API_TOKEN: z.string().optional(),

  // Cloudflare R2 (S3-compatible) storage for professional verification
  // documents (optional — falls back to local disk, which does NOT survive
  // a redeploy on Railway/Fly/Render/etc. Required before real professional
  // applications go through in production). dash.cloudflare.com -> R2.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function validateEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("\n");
      console.error("❌ Environment variable validation failed:\n", missing);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!env) {
    env = validateEnv();
  }
  return env;
}

// Validate on import in production
if (process.env.NODE_ENV === "production") {
  validateEnv();
}

