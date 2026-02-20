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
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";
import { validateEnv } from "./env";
import { securityHeaders, requestId, sanitizeInput } from "./middleware/security";
import { collectMetrics, getMetrics } from "./middleware/monitoring";
import { errorHandler } from "./middleware/errorHandler";

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
app.use(cors({
  origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === "production" ? false : true),
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Compression middleware for better performance
app.use(compression());

// Metrics collection
app.use(collectMetrics);

// Request size limit (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// WebSocket Server for real-time chat
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

interface ChatRoom {
  clients: Map<string, { ws: WebSocket; role: "client" | "professional"; userId: string }>;
}

const chatRooms = new Map<string, ChatRoom>();

interface WSMessage {
  type: "join" | "message" | "leave" | "typing";
  sessionId: string;
  userId: string;
  userRole: "client" | "professional";
  content?: string;
  timestamp?: string;
}

wss.on("connection", (ws, req) => {
  const { query } = parse(req.url || "", true);
  const sessionId = query.sessionId as string;
  const userId = query.userId as string;
  const userRole = query.role as "client" | "professional";

  if (!sessionId || !userId || !userRole) {
    ws.close(1008, "Missing required parameters");
    return;
  }

  // Create or join room
  if (!chatRooms.has(sessionId)) {
    chatRooms.set(sessionId, { clients: new Map() });
  }

  const room = chatRooms.get(sessionId)!;
  room.clients.set(userId, { ws, role: userRole, userId });

  log(`User ${userId} (${userRole}) joined session ${sessionId}`, "websocket");

  // Notify other participants
  room.clients.forEach((client, id) => {
    if (id !== userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "user_joined",
        userId,
        userRole,
        timestamp: new Date().toISOString(),
      }));
    }
  });

  ws.on("message", (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      // Broadcast to all clients in the room
      room.clients.forEach((client, id) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: message.type,
            userId: message.userId,
            userRole: message.userRole,
            content: message.content,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    } catch (error) {
      log(`WebSocket message error: ${error}`, "websocket");
    }
  });

  ws.on("close", () => {
    room.clients.delete(userId);
    log(`User ${userId} left session ${sessionId}`, "websocket");

    // Notify remaining participants
    room.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        const message = {
          type: "user_left",
          userId,
          userRole,
          timestamp: new Date().toISOString(),
        };
        log(`Sending user_left to ${client.userId} (${client.role}): ${JSON.stringify(message)}`, "websocket");
        client.ws.send(JSON.stringify(message));
      }
    });

    // Cleanup empty rooms
    if (room.clients.size === 0) {
      chatRooms.delete(sessionId);
    }
  });

  ws.on("error", (error) => {
    log(`WebSocket error for user ${userId}: ${error}`, "websocket");
  });
});

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

// Note: JSON parsing is already configured above with compression
// This is for webhook routes that need raw body
app.use(
  '/api/stripe/webhook',
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

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

  // Metrics endpoint (protected in production)
  app.get("/metrics", (req, res) => {
    // In production, you might want to add authentication here
    if (process.env.NODE_ENV === "production" && !req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
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
