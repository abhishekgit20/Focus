import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { emitInboxEvent } from "@/lib/realtimeEvents";

const MAX_RECONNECT_DELAY_MS = 30_000;

// Single source of truth for "this inbox event happened -> these cached
// queries are now stale." Previously every page that cared about live
// updates opened its own WebSocket connection and hand-picked which of its
// own queries to invalidate — easy to get right for the page being worked
// on and wrong for every other page reading the same data (which is
// exactly how the dashboard's availability toggle, the appointments list,
// and the professional-chat status card each independently went stale).
// One connection, one map, invalidated everywhere the data is used.
const QUERY_KEYS_BY_EVENT: Record<string, (string | number)[][]> = {
  session_request: [
    ["/api/sessions/pending-requests"],
    ["/api/professional/stats"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
  session_request_expired: [
    ["/api/sessions/pending-requests"],
    ["/api/professional/stats"],
  ],
  new_scheduled_booking: [
    ["/api/professional/sessions/today"],
    ["/api/professional/sessions"],
    ["/api/sessions/upcoming"],
    ["/api/professional/stats"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
  session_accepted: [
    ["/api/sessions"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
  session_declined: [
    ["/api/sessions"],
    ["/api/sessions/pending-requests"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
  session_timeout: [
    ["/api/sessions"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
  booking_confirmed: [
    ["/api/sessions"],
    ["/api/notifications"],
    ["/api/notifications/unread-count"],
  ],
};

// Broadcast payloads aren't uniform (some carry a flat `sessionId`, others
// a nested `session` object) — normalize rather than touching the already-
// verified server-side broadcast shapes.
function extractSessionId(data: Record<string, unknown>): string | undefined {
  if (typeof data.sessionId === "string") return data.sessionId;
  const session = data.session as { id?: string } | undefined;
  return session?.id;
}

// Mounted once at the app shell (see App.tsx) so it's live on every page,
// not just whichever one happened to open its own connection — the exact
// gap that made "only after refresh" possible in the first place.
export function useUserInboxSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || (user.role !== "client" && user.role !== "professional")) return;

    const roomId = user.role === "professional" ? `prof_${user.id}` : `client_${user.id}`;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws?sessionId=${roomId}`;

    let stopped = false;
    let ws: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // This connection carries every live notification/booking-status event
    // app-wide (see the map above) — previously a dropped connection (sleep,
    // background tab, brief wifi loss) meant no live updates ever again
    // until a full page reload, with no indication anything had gone wrong.
    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        reconnectAttempt = 0;
      };

      ws.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        const type = data.type as string | undefined;
        if (!type) return;

        const sessionId = extractSessionId(data);
        if (sessionId) {
          queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
          queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "counterpart"] });
        }

        const keys = QUERY_KEYS_BY_EVENT[type];
        if (keys) {
          for (const key of keys) queryClient.invalidateQueries({ queryKey: key });
        }

        emitInboxEvent({ type, ...data });
      };

      ws.onerror = (error) => console.error("Inbox WebSocket error:", error);

      ws.onclose = () => {
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
        reconnectAttempt++;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [user?.id, user?.role, queryClient]);
}
