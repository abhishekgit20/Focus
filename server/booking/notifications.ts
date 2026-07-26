import { storage } from "../storage";
import { broadcastToRoom } from "../realtime";

// Payment completion is what actually creates a live instant-session
// request — creation now happens before payment (slot reservation), so the
// professional must be notified once the booking is genuinely paid for,
// regardless of which payment path got it there (wallet, checkout callback,
// or the server-to-server webhook fallback).
export async function notifyIfInstantSessionNowPending(sessionId: string): Promise<void> {
  const session = await storage.getSession(sessionId);
  if (!session || session.mode !== "instant" || session.status !== "pending") return;

  const client = await storage.getUser(session.clientId);
  broadcastToRoom(`prof_${session.professionalId}`, {
    type: "session_request",
    session,
    client: client ? { id: client.id, fullName: client.fullName, profileImage: client.profileImage } : undefined,
  });
  await storage.createNotification({
    userId: session.professionalId,
    type: "instant_session_request",
    title: "New instant session request",
    body: `${client?.fullName ?? "A client"} wants to start a ${session.type} session now.`,
    relatedSessionId: session.id,
  });
}
