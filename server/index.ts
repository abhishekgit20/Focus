import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupAuth } from "./replitAuth";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
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
        client.ws.send(JSON.stringify({
          type: "user_left",
          userId,
          userRole,
          timestamp: new Date().toISOString(),
        }));
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
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not found, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const domains = process.env.REPLIT_DOMAINS;
    const webhookBaseUrl = domains ? `https://${domains.split(',')[0]}` : 'http://localhost:5000';
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'Managed webhook for Focus platform',
      }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
