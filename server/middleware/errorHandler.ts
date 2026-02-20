// Enhanced error handling for production
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(400, message, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(429, message, "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * Enhanced error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).requestId || "unknown";

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      errors: err.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
      })),
      requestId,
    });
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const statusCode = err.statusCode || 500;
    const response: any = {
      error: err.message,
      code: err.code || "ERROR",
      requestId,
    };

    if (err instanceof ValidationError && err.errors) {
      response.errors = err.errors;
    }

    // Log error (but not in production for operational errors)
    if (!err.isOperational || process.env.NODE_ENV !== "production") {
      console.error(`[${requestId}] Error:`, {
        statusCode,
        code: err.code,
        message: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      });
    }

    return res.status(statusCode).json(response);
  }

  // Handle unexpected errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message;

  // Always log unexpected errors
  console.error(`[${requestId}] Unexpected error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_ERROR",
    requestId,
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

