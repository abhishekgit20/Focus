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
  
  // Payment providers (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  
  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // AI services (optional)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  // Replit (optional)
  REPL_ID: z.string().optional(),
  REPL_SLUG: z.string().optional(),
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

