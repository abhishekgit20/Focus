import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import { parse } from "url";
import { authenticateUpgradeRequest } from "./wsAuth";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { refundBooking, completeSessionAndPayout } from "./booking/paymentEngine";

interface RoomClient {
  ws: WebSocket;
  role: "client" | "professional";
  userId: string;
}

interface ChatRoom {
  clients: Map<string, RoomClient>;
}

interface WSMessage {
  type: "join" | "message" | "leave" | "typing" | "webrtc-offer" | "webrtc-answer" | "webrtc-ice-candidate";
  content?: string;
  // WebRTC signaling payload (SDP offer/answer or an ICE candidate) — kept
  // separate from `content` so the two message families don't collide, and
  // relayed opaquely: the server never parses or validates the SDP itself,
  // just forwards it between the two authorized parties in the room.
  payload?: unknown;
}

const chatRooms = new Map<string, ChatRoom>();

// Chat spam / flood protection: a connected client could otherwise send
// thousands of messages per second (or one huge payload) with no REST-style
// rate limiter in the way, since WS bypasses express-rate-limit entirely.
const MAX_MESSAGE_BYTES = 32 * 1024; // 32KB — plenty for chat text or a WebRTC SDP offer/answer, not for abuse
const RATE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 30;
const MAX_VIOLATIONS_BEFORE_DISCONNECT = 3;

interface RateState {
  windowStart: number;
  count: number;
  violations: number;
}
const messageRateState = new Map<string, RateState>(); // keyed by connection userId

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  let state = messageRateState.get(userId);
  if (!state || now - state.windowStart > RATE_WINDOW_MS) {
    state = { windowStart: now, count: 0, violations: state?.violations ?? 0 };
    messageRateState.set(userId, state);
  }
  state.count++;
  if (state.count > MAX_MESSAGES_PER_WINDOW) {
    state.violations++;
    return true;
  }
  return false;
}

// Billing integrity: the server — never the client — decides when a paid
// session started and ended. A session "starts" the moment both the client
// and professional are simultaneously connected to its room, and "ends"
// (after a short grace period, to ride out brief reconnects) once the room
// empties back out. Cost is computed from real elapsed wall-clock time on
// this timer, not from anything either party reports.
const FINALIZE_GRACE_MS = 15_000;
interface BillingState {
  startedAt: Date;
  finalizeTimer?: NodeJS.Timeout;
}
const billingState = new Map<string, BillingState>();

async function finalizeSessionBilling(sessionId: string) {
  const state = billingState.get(sessionId);
  if (!state) return;
  billingState.delete(sessionId);

  try {
    const session = await storage.getSession(sessionId);
    if (!session || session.status === "cancelled") return;

    const endedAt = new Date();
    const durationMinutes = Math.max(1, Math.ceil((endedAt.getTime() - state.startedAt.getTime()) / 60000));

    // completeSessionAndPayout holds a row lock for its whole read-check-
    // write, so this and a concurrent PATCH /api/sessions/:id/status
    // "completed" request can't both see "not yet completed" and both
    // create a payout — whichever gets there first wins, the other gets
    // alreadyCompleted:true and does nothing further.
    const result = await completeSessionAndPayout(sessionId, state.startedAt, endedAt, durationMinutes);
    if (result.alreadyCompleted) {
      rtLog(`Session ${sessionId} was already completed (race with the REST completion path) — skipped duplicate payout`);
      return;
    }

    rtLog(`Session ${sessionId} completed server-side: ${durationMinutes}min elapsed, ₹${session.priceAtBooking ?? "0"} charged`);
  } catch (error) {
    rtLog(`Failed to finalize billing for session ${sessionId}: ${error}`);
  }
}

// Auto-expires instant-session requests the professional never responded to
// within their configured timeout. Refunds (not "voids" — see the payment
// design notes) whatever was captured, notifies both parties, and suggests
// other online professionals with the same specialization.
const INSTANT_TIMEOUT_SWEEP_MS = 15_000;

export function startInstantSessionTimeoutSweep() {
  setInterval(async () => {
    try {
      const expired = await storage.getExpiredInstantRequests();
      for (const session of expired) {
        try {
          await refundBooking(session.id, "professional_timeout", null);
          const recommendations = await storage.getSimilarOnlineProfessionals(
            session.professionalId,
            session.type,
            session.sessionTemplateId!
          );
          broadcastToRoom(`client_${session.clientId}`, {
            type: "session_timeout",
            sessionId: session.id,
            recommendations,
            timestamp: new Date().toISOString(),
          });
          broadcastToRoom(`prof_${session.professionalId}`, {
            type: "session_request_expired",
            sessionId: session.id,
            timestamp: new Date().toISOString(),
          });
          rtLog(`Instant session ${session.id} timed out — refunded and notified client`);
        } catch (err) {
          rtLog(`Failed to process timeout for session ${session.id}: ${err}`);
        }
      }
    } catch (err) {
      rtLog(`Instant-session timeout sweep failed: ${err}`);
    }
  }, INSTANT_TIMEOUT_SWEEP_MS);
}

function rtLog(message: string) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${time} [websocket] ${message}`);
}

// A room is a professional's personal request inbox (`prof_<userId>`), a
// client's personal booking-status inbox (`client_<userId>`, symmetric —
// used to push accept/decline/timeout events for a request that has no
// session-room WS connection yet), or a real booked/instant session id.
// Only let someone connect to a room they actually belong to — otherwise
// anyone could eavesdrop on another professional's incoming client
// requests, or on someone else's live consultation, just by knowing/
// guessing an id.
async function authorizeRoom(sessionId: string, user: User): Promise<"client" | "professional" | null> {
  if (sessionId.startsWith("prof_")) {
    const ownerId = sessionId.slice("prof_".length);
    return user.role === "professional" && user.id === ownerId ? "professional" : null;
  }
  if (sessionId.startsWith("client_")) {
    const ownerId = sessionId.slice("client_".length);
    return user.id === ownerId ? "client" : null;
  }

  const session = await storage.getSession(sessionId);
  if (!session) return null;
  if (session.clientId === user.id) return "client";
  if (session.professionalId === user.id) return "professional";
  return null;
}

// Live signaling for chat/call sessions, keyed by sessionId. Professionals also
// hold a personal "inbox" room (`prof_<userId>`) so the server can push instant
// session requests to their dashboard without them having any session ID yet.
//
// SECURITY: the previous version trusted `userId`/`role` query params supplied
// by the client with no verification at all, so anyone (even logged out) could
// open a socket claiming to be any user and read/inject messages into any
// room. Every connection is now authenticated against the real session
// cookie and authorized against the specific room before the upgrade
// completes, and per-message identity is bound to that connection instead of
// trusting the payload.
export function setupWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    verifyClient: (info, callback) => {
      (async () => {
        const { query } = parse(info.req.url || "", true);
        const sessionId = query.sessionId as string;
        if (!sessionId) {
          callback(false, 400, "Missing sessionId");
          return;
        }

        const user = await authenticateUpgradeRequest(info.req as IncomingMessage);
        if (!user) {
          callback(false, 401, "Unauthorized");
          return;
        }

        const role = await authorizeRoom(sessionId, user);
        if (!role) {
          callback(false, 403, "Forbidden");
          return;
        }

        (info.req as IncomingMessage & { authUser: User; authRole: "client" | "professional"; sessionId: string }).authUser = user;
        (info.req as any).authRole = role;
        (info.req as any).sessionId = sessionId;
        callback(true);
      })().catch((error) => {
        rtLog(`verifyClient error: ${error}`);
        callback(false, 500, "Internal error");
      });
    },
  });

  // Heartbeat: a client that disconnects uncleanly (laptop sleep, crash,
  // wifi drop without a TCP FIN) previously wasn't detected until the
  // underlying TCP socket eventually timed out on its own — which can take
  // a very long time or never within a session window. The remaining party
  // saw a frozen peer with no "user_left" event, and billing (via
  // FINALIZE_GRACE_MS below) kept the room looking occupied. Standard `ws`
  // pattern: ping everyone every 30s, terminate anyone who didn't pong
  // since the last check.
  const HEARTBEAT_INTERVAL_MS = 30_000;
  wss.on("connection", (ws) => {
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    ws.on("pong", () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
  });
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const tracked = ws as WebSocket & { isAlive?: boolean };
      if (tracked.isAlive === false) {
        ws.terminate();
        return;
      }
      tracked.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);
  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws, req) => {
    const authedReq = req as IncomingMessage & { authUser: User; authRole: "client" | "professional"; sessionId: string };
    const userId = authedReq.authUser.id;
    const userRole = authedReq.authRole;
    const sessionId = authedReq.sessionId;

    if (!chatRooms.has(sessionId)) {
      chatRooms.set(sessionId, { clients: new Map() });
    }

    const room = chatRooms.get(sessionId)!;
    room.clients.set(userId, { ws, role: userRole, userId });

    rtLog(`User ${userId} (${userRole}) joined session ${sessionId}`);

    const isRealSession = !sessionId.startsWith("prof_") && !sessionId.startsWith("client_");
    if (isRealSession) {
      const existingBilling = billingState.get(sessionId);
      if (existingBilling?.finalizeTimer) {
        // Rejoined within the grace period after the room emptied — the
        // session is still live, don't finalize/bill it as ended.
        clearTimeout(existingBilling.finalizeTimer);
        existingBilling.finalizeTimer = undefined;
      } else if (!existingBilling && room.clients.size === 2) {
        // Both parties are now present for the first time: this is the
        // authoritative, server-timestamped start of the billable session.
        const startedAt = new Date();
        billingState.set(sessionId, { startedAt });
        storage.updateSessionStatus(sessionId, "in_progress", startedAt).catch((error) =>
          rtLog(`Failed to record session start for ${sessionId}: ${error}`)
        );
      }
    }

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

    ws.on("message", async (data) => {
      const raw = data.toString();
      const byteLength = Buffer.byteLength(raw, "utf8");
      if (byteLength > MAX_MESSAGE_BYTES) {
        rtLog(`User ${userId} sent an oversized WS message (${byteLength} bytes) — dropped`);
        return;
      }

      if (isRateLimited(userId)) {
        const state = messageRateState.get(userId);
        rtLog(`User ${userId} exceeded WS message rate limit (violation ${state?.violations})`);
        if ((state?.violations ?? 0) >= MAX_VIOLATIONS_BEFORE_DISCONNECT) {
          ws.close(1008, "Rate limit exceeded");
        }
        return;
      }

      try {
        const message: WSMessage = JSON.parse(raw);

        // Chat text is persisted before it's relayed — previously this only
        // existed in-memory, so it vanished on refresh and a message could
        // show as "sent" locally even if it was never actually delivered
        // anywhere durable. WebRTC signaling/typing frames aren't chat
        // history, so only "message" frames with real content are saved,
        // and only for a real session room (not the prof_/client_ inboxes,
        // which never carry chat).
        if (message.type === "message" && isRealSession && message.content?.trim()) {
          try {
            await storage.createSessionMessage({
              sessionId,
              senderId: userId,
              senderRole: userRole,
              content: message.content,
            });
          } catch (persistError) {
            rtLog(`Failed to persist chat message for session ${sessionId}: ${persistError}`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "message_failed", timestamp: new Date().toISOString() }));
            }
            return; // Don't relay a message that wasn't actually saved.
          }
        }

        // Identity is always the authenticated connection's, never the payload's.
        room.clients.forEach((client) => {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: message.type,
              userId,
              userRole,
              content: message.content,
              payload: message.payload,
              timestamp: new Date().toISOString(),
            }));
          }
        });
      } catch (error) {
        rtLog(`WebSocket message error: ${error}`);
      }
    });

    ws.on("close", () => {
      room.clients.delete(userId);
      messageRateState.delete(userId);
      rtLog(`User ${userId} left session ${sessionId}`);

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

      if (room.clients.size === 0) {
        chatRooms.delete(sessionId);

        const state = billingState.get(sessionId);
        if (isRealSession && state && !state.finalizeTimer) {
          state.finalizeTimer = setTimeout(() => {
            finalizeSessionBilling(sessionId);
          }, FINALIZE_GRACE_MS);
        }
      }
    });

    ws.on("error", (error) => {
      rtLog(`WebSocket error for user ${userId}: ${error}`);
    });
  });

  return wss;
}

// Push a server-originated event (e.g. an incoming session request, or a decline)
// into a room. Used by REST route handlers that have no WS connection of their own.
export function broadcastToRoom(roomId: string, message: Record<string, unknown>, excludeUserId?: string) {
  const room = chatRooms.get(roomId);
  if (!room) return;

  room.clients.forEach((client, id) => {
    if (id !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}
