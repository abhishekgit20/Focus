// Load environment variables from .env file
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupAuth } from "./auth";
import { createServer } from "http";
import { WebhookHandlers } from './webhookHandlers';
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

const app = express();
const httpServer = createServer(app);

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
  express.raw({ type: 'application/json' }),
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

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Trust proxy for correct IP and protocol detection behind reverse proxies
  app.set("trust proxy", 1);
  
  await initStripe();
  await setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

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
  httpServer.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
    if (process.env.NODE_ENV === "production") {
      log("Production mode - serving static files");
    } else {
      log("Development mode - using Vite middleware");
    }
  });
})();
