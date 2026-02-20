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
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    );
  }
  
  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
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

/**
 * Sanitize request body
 * Removes potentially dangerous fields
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    // Remove common dangerous fields
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
  }
  next();
}

