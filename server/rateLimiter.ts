// Rate limiting middleware for security
import rateLimit from "express-rate-limit";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for signup
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signups per hour
  message: "Too many signup attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OAuth endpoints
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OAuth attempts per windowMs
  message: "Too many OAuth attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: "Too many AI requests, please try again in a moment.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for payment endpoints
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 payment requests per minute
  message: "Too many payment requests, please try again in a moment.",
  standardHeaders: true,
  legacyHeaders: false,
});

