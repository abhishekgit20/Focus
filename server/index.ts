// Load environment variables from .env file
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupAuth } from "./auth";
import { createServer } from "http";
import { WebhookHandlers } from './webhookHandlers';
import { verifyWebhookSignature } from './razorpayClient';
import { captureFromWebhook, releaseExpiredReservations } from './booking/paymentEngine';
import { notifyIfInstantSessionNowPending } from './booking/notifications';
import { startInstantSessionTimeoutSweep } from './realtime';
import { runReconciliation } from './reconciliation';
import { logSecurityEvent } from './security/events';
import { setupWebSocketServer } from "./realtime";
import { validateEnv } from "./env";
import { securityHeaders, requestId, sanitizeInput } from "./middleware/security";
import { collectMetrics, getMetrics } from "./middleware/monitoring";
import { errorHandler } from "./middleware/errorHandler";
import { testConnection } from "./db";
import { storage } from "./storage";
import { flagDispute } from "./booking/disputes";
import crypto from "crypto";

// Validate environment variables first
validateEnv();

const app = express();
const httpServer = createServer(app);

// Security headers (must be early in middleware chain)
app.use(securityHeaders);

// Request ID tracking
app.use(requestId);

// Input sanitization
app.use(sanitizeInput);

// Security and performance middleware
// Previously reflected *any* origin back with credentials enabled in
// non-production environments (cors' `origin: true`), which lets any site a
// logged-in user has open in another tab make authenticated cross-origin
// requests against this API. Pinned to the actual local dev origins instead.
const DEV_ORIGINS = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(cors({
  origin: process.env.FRONTEND_URL
    ?? (process.env.NODE_ENV === "production" ? false : DEV_ORIGINS),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression middleware for better performance
app.use(compression());

// Metrics collection
app.use(collectMetrics);

// Webhook routes need the raw request body for signature verification, so
// they must be registered — with their own express.raw() middleware —
// BEFORE the global express.json() below, which would otherwise consume and
// parse the body first, leaving nothing for the signature check to verify
// against. (This ordering bug previously affected the Stripe webhook: it
// was registered after the global parser and would fail on every real call
// with "Payload must be a Buffer" — fixed here by moving both up.)
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json', limit: '10mb' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig, webhookSecret);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.post(
  '/api/payments/razorpay-webhook',
  express.raw({ type: 'application/json', limit: '10mb' }),
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: 'Missing x-razorpay-signature' });
    }
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    if (!Buffer.isBuffer(req.body)) {
      console.error('RAZORPAY WEBHOOK ERROR: req.body is not a Buffer');
      return res.status(500).json({ error: 'Webhook processing error' });
    }

    const rawBody = (req.body as Buffer).toString('utf-8');
    if (!verifyWebhookSignature(rawBody, signature)) {
      await logSecurityEvent({ type: 'payment.verification_failed', req, metadata: { source: 'razorpay_webhook' } });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: 'Malformed payload' });
    }

    // Razorpay webhook payloads have no reliable top-level unique event ID
    // (unlike Stripe's evt_...) — a signature-verified payload's own content
    // hash is a valid stand-in: a genuine gateway retry resends the exact
    // same bytes, so the hash matches and this is skipped as already-seen.
    const eventId = crypto.createHash('sha256').update(rawBody).digest('hex');
    const logged = await storage.recordWebhookEventIfNew({
      gateway: 'razorpay',
      eventId,
      eventType: event.event || 'unknown',
      payload: event,
      status: 'received',
    });
    if (!logged) {
      console.log(`Razorpay event ${eventId} already logged, skipping (gateway redelivery)`);
      return res.status(200).json({ received: true });
    }

    try {
      if (event.event === 'payment.captured') {
        const payment = event.payload?.payment?.entity;
        if (payment?.order_id && payment?.id) {
          const result = await captureFromWebhook(payment.order_id, payment.id);
          const sessionId = result.bookingPayments?.[0]?.sessionId;
          if (sessionId) await notifyIfInstantSessionNowPending(sessionId);
        }
      } else if (typeof event.event === 'string' && event.event.startsWith('payment.dispute.')) {
        // Chargebacks must never be silently dropped — not automated
        // end-to-end yet, but the affected booking gets flagged and an
        // admin alert email goes out. Field names here follow Razorpay's
        // documented payload.<entity>.entity nesting (same shape as
        // payment.captured above); verify against a real dispute payload
        // before relying on this in production, since none has fired yet.
        const dispute = event.payload?.dispute?.entity;
        if (dispute?.id) {
          await flagDispute({
            gateway: 'razorpay',
            gatewayDisputeId: dispute.id,
            gatewayPaymentId: dispute.payment_id ?? null,
            reason: dispute.reason_code ?? dispute.reason ?? null,
            amount: typeof dispute.amount === 'number' ? (dispute.amount / 100).toFixed(2) : '0.00',
            status: dispute.status ?? event.event,
            raw: dispute,
          });
        }
      }
      // Other event types (refund.processed, payment.failed, etc.) are
      // handled by the synchronous checkout-callback / refund flows today;
      // this webhook exists specifically as the fallback for a capture that
      // completed after the browser disconnected.
      await storage.markWebhookEventProcessed(logged.id);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Razorpay webhook error:', error.message);
      await storage.markWebhookEventFailed(logged.id, error.message);
      // A real processing error (as opposed to a bad signature, already
      // handled above) now returns 500 so Razorpay's own retry can recover
      // a transient failure (DB blip, etc.) — the event log row is the
      // backstop if retries are also exhausted, not a reason to suppress them.
      res.status(500).json({ error: 'processing_error' });
    }
  }
);

// Request size limit (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// WebSocket server for real-time chat/call signaling and dashboard notifications
setupWebSocketServer(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.log('STRIPE_SECRET_KEY not found, Stripe features will be disabled');
    return;
  }

  try {
    console.log('Stripe initialized (webhook endpoint: /api/stripe/webhook)');
    console.log('Note: Configure your Stripe webhook endpoint in the Stripe Dashboard');
    console.log('Webhook secret should be set in STRIPE_WEBHOOK_SECRET environment variable');
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}


export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Sanitize logged responses - remove sensitive data
      if (capturedJsonResponse) {
        const sanitized = { ...capturedJsonResponse };
        // Remove sensitive fields from logs
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.secret;
        delete sanitized.apiKey;
        delete sanitized.accessToken;
        delete sanitized.refreshToken;
        // Only log if not too large
        if (JSON.stringify(sanitized).length < 500) {
          logLine += ` :: ${JSON.stringify(sanitized)}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate required environment variables in production
  if (process.env.NODE_ENV === "production") {
    const requiredVars = ["DATABASE_URL", "SESSION_SECRET"];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
      console.error("Application cannot start in production without these variables.");
      process.exit(1);
    }
  }

  // Trust proxy for correct IP and protocol detection behind reverse proxies
  app.set("trust proxy", 1);
  
  await initStripe();
  await setupAuth(app);
  await registerRoutes(httpServer, app);

  // Booking payment-reservation TTL sweep — no job queue exists in this app,
  // so expired 'payment_pending' slot reservations are released by an
  // in-process interval, same pattern as the existing metrics collection.
  setInterval(() => {
    releaseExpiredReservations().catch((err) => console.error("Reservation sweep failed:", err));
  }, 30_000);
  startInstantSessionTimeoutSweep();

  // Daily gateway-vs-local-DB payment reconciliation. Same in-process
  // interval pattern as the sweeps above — runs once shortly after boot
  // (so a mismatch doesn't sit undetected for up to 24h after a deploy),
  // then every 24h.
  const RECONCILIATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runReconciliation().catch((err) => console.error("Reconciliation run failed:", err));
  }, RECONCILIATION_INTERVAL_MS);
  runReconciliation().catch((err) => console.error("Reconciliation run failed:", err));

  // Health check endpoint (must be before error handler)
  app.get("/health", async (_req, res) => {
    try {
      // Quick database check
      const dbHealthy = await testConnection().catch(() => false);
      
      res.status(dbHealthy ? 200 : 503).json({
        status: dbHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        database: dbHealthy ? "connected" : "disconnected",
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics endpoint — gated on a real shared secret in production.
  // Previously this only checked *that an Authorization header was present*,
  // not its value, so any request with e.g. "Authorization: x" got in.
  app.get("/metrics", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      const token = process.env.METRICS_TOKEN;
      const provided = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      const authorized = !!token && !!provided
        && token.length === provided.length
        && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(provided));
      if (!authorized) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    res.json(getMetrics());
  });

  // Use enhanced error handler (must be last middleware)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}, starting graceful shutdown...`, "server");
    httpServer.close(() => {
      log("HTTP server closed", "server");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      log("Forcing shutdown after timeout", "server");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  httpServer.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
    if (process.env.NODE_ENV === "production") {
      log("Production mode - serving static files");
    } else {
      log("Development mode - using Vite middleware");
    }
  });
})();
