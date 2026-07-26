// Security middleware for production readiness
import type { Request, Response, NextFunction } from "express";

/**
 * Security headers middleware
 * Sets essential security headers for production
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy (adjust based on your needs)
  // Previously allowed 'unsafe-inline' + 'unsafe-eval' for scripts, which
  // defeats CSP's main purpose: it lets injected script (e.g. via a stored
  // XSS) execute freely instead of being blocked. Neither is actually needed
  // here — the app ships no inline <script> tags — so both are dropped.
  // Explicit allowances are for the real third-party resources this app
  // loads: Razorpay's checkout script/iframe and Google Fonts.
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' https://checkout.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https:",
        "frame-src https://api.razorpay.com https://checkout.razorpay.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    );
  }
  
  // Permissions policy — camera/microphone are allowed for this origin only
  // (not third parties/iframes), since voice/video sessions genuinely need
  // getUserMedia now. Previously blocked entirely ("=()" with no allowlist
  // at all), which silently rejected every getUserMedia call at the policy
  // level before the browser ever showed its own permission prompt —
  // indistinguishable from the user denying access, but nothing they could
  // fix on their end.
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(self), camera=(self)"
  );
  
  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === "production" && req.secure) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  
  next();
}

/**
 * Request ID middleware
 * Adds unique request ID for tracing
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
}

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Recursively, not just top-level: a shallow check only stops the most naive
// attack and gives a false sense of safety against prototype-pollution gadgets
// reachable through nested objects/arrays.
function stripDangerousKeys(value: unknown, depth = 0): void {
  if (depth > 20 || value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) stripDangerousKeys(item, depth + 1);
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    stripDangerousKeys((value as Record<string, unknown>)[key], depth + 1);
  }
}

/**
 * Sanitize request body
 * Strips keys that could be used for prototype-pollution gadgets, at any
 * nesting depth (not just the top level).
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    stripDangerousKeys(req.body);
  }
  next();
}

