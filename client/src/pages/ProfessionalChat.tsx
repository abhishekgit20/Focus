import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, ArrowLeft, Loader2, User as UserIcon } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getSessionById, getSessionCounterpart, updateSessionStatus, getSessionMessages, sendSessionMessageViaRest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { CallPanel } from "@/components/CallPanel";

interface Message {
  id: string;
  sender: "user" | "professional";
  text: string;
  timestamp: Date;
}

interface WSIncoming {
  type: "message" | "message_failed" | "user_joined" | "user_left" | "typing";
  userId?: string;
  userRole?: "client" | "professional";
  content?: string;
  timestamp?: string;
}

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e2e8f0'/><circle cx='100' cy='78' r='38' fill='%23a0aec0'/><ellipse cx='100' cy='190' rx='70' ry='55' fill='%23a0aec0'/></svg>";

export default function ProfessionalChat() {
  const [, params] = useRoute("/professional-chat/:sessionId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const sessionId = params?.sessionId || "";

  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/sessions", sessionId],
    queryFn: () => getSessionById(sessionId),
    enabled: !!sessionId,
    // Session status (pending/scheduled/in_progress/completed) changes
    // constantly and correctness matters here — the global 5-minute
    // staleTime is meant for slower-changing data and previously caused a
    // stale "not accepted yet" screen to persist after a real accept if
    // this session had been fetched even once before in this browser tab.
    staleTime: 0,
    refetchOnMount: "always",
  });
  const session = sessionData?.session;

  const { data: counterpartData, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/sessions", sessionId, "counterpart"],
    queryFn: () => getSessionCounterpart(sessionId),
    enabled: !!sessionId,
  });
  const client = counterpartData
    ? {
        name: counterpartData.counterpart.fullName || "Client",
        image: counterpartData.counterpart.profileImage || FALLBACK_AVATAR,
      }
    : { name: "", image: FALLBACK_AVATAR };

  const sessionType = session?.type === "audio" ? "call" : (session?.type as "chat" | "video") || "chat";

  const [phase, setPhase] = useState<"pending" | "ready" | "live" | "ended">("pending");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [callWs, setCallWs] = useState<WebSocket | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  const plannedMinutes = session?.plannedDurationMinutes ?? 0;
  const price = session?.priceAtBooking ?? "0.00";

  const call = useWebRTCCall({
    ws: callWs,
    active: phase === "live" && sessionType !== "chat" && !!user?.id,
    withVideo: sessionType === "video",
    // The client always initiates the offer, the professional always answers
    // — see Consultation.tsx's mirrored isInitiator: true.
    isInitiator: false,
    myUserId: user?.id ?? "",
  });

  // Reflect the session's server status. The WS room's own authorization
  // (realtime.ts) only checks that this professional owns the session, not
  // its status — so this page must be the thing that stops an instant
  // request still awaiting accept/decline from being joined (and billed)
  // as if it were already confirmed. Only "scheduled" (accepted) or
  // "in_progress" (rejoining a live session) show a Join button.
  useEffect(() => {
    if (!session) return;
    if (session.status === "in_progress") setPhase("live");
    else if (session.status === "completed" || session.status === "cancelled") setPhase("ended");
    else if (session.status === "scheduled") setPhase("ready");
    else setPhase("pending");
  }, [session?.status]);

  const persistSessionEnd = useCallback(async () => {
    if (!sessionId) return;
    try {
      await updateSessionStatus(sessionId, "completed", {
        durationMinutes: Math.max(1, Math.ceil(sessionDuration / 60)),
      });
    } catch (error) {
      console.error("Failed to record session completion:", error);
    }
  }, [sessionId, sessionDuration]);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setCallWs(ws);

    ws.onopen = () => {
      if (reconnectAttemptRef.current > 0) {
        toast({ title: "Reconnected", description: "You're back online." });
      }
      reconnectAttemptRef.current = 0;
      setIsReconnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSIncoming = JSON.parse(event.data);

        if (data.type === "message" && data.userRole === "client") {
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), sender: "user", text: data.content || "", timestamp: new Date(data.timestamp!) },
          ]);
        } else if (data.type === "user_joined" && data.userRole === "client") {
          toast({ title: "Client connected", description: `${client.name} has joined the session.` });
        } else if (data.type === "user_left" && data.userRole === "client") {
          setPhase("ended");
          intentionalCloseRef.current = true;
          wsRef.current?.close();
          setCallWs(null);
          toast({ title: "Session ended", description: "The client has left the session.", variant: "destructive" });
          persistSessionEnd();
        } else if (data.type === "message_failed") {
          toast({ title: "Message not sent", description: "Please try sending it again.", variant: "destructive" });
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);

    // Previously a dropped connection (sleep, brief wifi loss) just sat
    // there with no reconnect attempt and no visible sign anything was wrong.
    ws.onclose = () => {
      if (intentionalCloseRef.current || phaseRef.current !== "live") return;
      if (reconnectAttemptRef.current === 0) {
        toast({ title: "Connection lost", description: "Reconnecting...", variant: "destructive" });
      }
      setIsReconnecting(true);
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30_000);
      reconnectAttemptRef.current++;
      reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
    };

    return ws;
  }, [sessionId, client.name, toast, persistSessionEnd]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (phase === "live") {
      timerRef.current = setInterval(() => setSessionDuration((p) => p + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const joinSession = async () => {
    setSessionDuration(0);
    setPhase("live");
    const ws = connectWebSocket();
    setCallWs(ws);

    const placeholder: Message = { id: "1", sender: "user", text: `Connecting to ${client.name}...`, timestamp: new Date() };
    try {
      // Restores the transcript from a previous connection to this same
      // session — this used to always start blank since chat only ever
      // lived in the in-memory WS relay.
      const { messages: history } = await getSessionMessages(sessionId);
      setMessages(
        history.length > 0
          ? history.map((m) => ({
              id: m.id,
              sender: m.senderRole === "professional" ? "professional" : "user",
              text: m.content,
              timestamp: new Date(m.createdAt),
            }))
          : [placeholder]
      );
    } catch {
      setMessages([placeholder]);
    }
  };

  const endSession = () => {
    setPhase("ended");
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    setCallWs(null);
    toast({ title: "Session Ended", description: `Total duration: ${formatTime(sessionDuration)}` });
    persistSessionEnd();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || phase !== "live") return;
    const text = inputMessage;
    const message: Message = { id: Date.now().toString(), sender: "professional", text, timestamp: new Date() };
    setMessages((prev) => [...prev, message]);
    setInputMessage("");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      return;
    }
    // The socket wasn't open (still connecting, briefly dropped) — falls
    // back to a REST send, which persists the same way and pushes it live
    // to the client if they're connected. Previously the message just
    // vanished here with no error and no way to know it hadn't gone anywhere.
    try {
      await sendSessionMessageViaRest(sessionId, text);
    } catch {
      toast({ title: "Message not sent", description: "Please check your connection and try again.", variant: "destructive" });
    }
  };

  if (sessionLoading || clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>We couldn't find this session.</p>
            <Link href="/professional-dashboard"><Button className="mt-4" variant="outline">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30">
        <div className="bg-primary text-primary-foreground py-4 px-4 sticky top-0 z-10">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10" onClick={() => setLocation("/professional-dashboard")} aria-label="Back to dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={client.image} alt={client.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
                <div>
                  <h2 className="font-semibold text-sm">{client.name || "Client Session"}</h2>
                  <p className="text-xs opacity-80">{sessionType === "chat" ? "Text Chat" : sessionType === "call" ? "Voice Call" : "Video Call"}</p>
                </div>
              </div>
            </div>

            {phase === "live" && (
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm">{formatTime(sessionDuration)} / {plannedMinutes} min</span>
                </div>
                <div className="bg-green-500/20 px-3 py-1.5 rounded-full text-sm">₹{price} (fixed)</div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {phase === "pending" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-6">
                  This request hasn't been accepted yet. Accept or decline it from your dashboard to continue.
                </p>
                <Link href="/professional-dashboard"><Button className="w-full">Back to Dashboard</Button></Link>
              </CardContent>
            </Card>
          )}

          {phase === "ready" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <img src={client.image} alt={client.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20" />
                <h2 className="text-2xl font-bold font-serif mb-1">{client.name || "Client"}</h2>

                <div className="bg-muted rounded-lg p-4 my-6">
                  <div className="text-sm text-muted-foreground mb-1">Session</div>
                  <div className="text-2xl font-bold text-primary">₹{price}</div>
                  <div className="text-xs text-muted-foreground mt-1">{plannedMinutes} minutes</div>
                </div>

                <Badge variant="secondary" className="mb-6">
                  {sessionType === "chat" ? "Text Chat" : sessionType === "call" ? "Voice Call" : "Video Call"}
                </Badge>

                <Button size="lg" className="w-full" onClick={joinSession}>
                  {sessionType === "chat" ? "Join Chat Session" : sessionType === "call" ? "Join Voice Call" : "Join Video Call"}
                </Button>
                {sessionType !== "chat" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    This call connects you directly with {client.name.split(" ")[0] || "your client"} and is not recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {phase === "ended" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-bold mb-2">Session ended</h2>
                <p className="text-muted-foreground mb-6">Duration: {formatTime(sessionDuration)}</p>
                <Link href="/professional-dashboard"><Button className="w-full">Back to Dashboard</Button></Link>
              </CardContent>
            </Card>
          )}

          {phase === "live" && (
            <div className="flex flex-col h-[calc(100vh-180px)]">
              {(sessionType === "call" || sessionType === "video") && (
                <CallPanel
                  withVideo={sessionType === "video"}
                  peerName={client.name || "Client"}
                  peerAvatar={client.image}
                  call={call}
                  onHangup={endSession}
                />
              )}

              <Card className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Waiting for messages...</p>
                      </div>
                    )}
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender === "professional" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.sender === "professional" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${message.sender === "professional" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your response..."
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {sessionType === "chat" && (
                    <div className="flex justify-center mt-4">
                      <Button variant="destructive" onClick={endSession}>End Session</Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
