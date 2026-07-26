import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Clock,
  ArrowLeft,
  Star,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getSessionById, getProfessionalProfile, updateSessionStatus, getSessionMessages, sendSessionMessageViaRest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { CallPanel } from "@/components/CallPanel";
import { onInboxEvent } from "@/lib/realtimeEvents";

interface Message {
  id: string;
  sender: "user" | "professional";
  text: string;
  timestamp: Date;
}

interface Recommendation {
  id: string;
  fullName: string | null;
  specialization: string;
  profileImage: string | null;
}

interface WSIncoming {
  type: "message" | "message_failed" | "user_joined" | "user_left" | "typing" | "session_declined" | "session_accepted" | "session_timeout";
  userId?: string;
  userRole?: "client" | "professional";
  content?: string;
  timestamp?: string;
  recommendations?: Recommendation[];
}

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e2e8f0'/><circle cx='100' cy='78' r='38' fill='%23a0aec0'/><ellipse cx='100' cy='190' rx='70' ry='55' fill='%23a0aec0'/></svg>";

export default function Consultation() {
  const [, params] = useRoute("/consultation/:sessionId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const sessionId = params?.sessionId || "";

  const { data: sessionData, isLoading: sessionLoading, refetch: refetchSession } = useQuery({
    queryKey: ["/api/sessions", sessionId],
    queryFn: () => getSessionById(sessionId),
    enabled: !!sessionId,
    // See ProfessionalChat.tsx's identical override — session status changes
    // constantly and the global 5-minute staleTime caused stale phases
    // (e.g. still showing "waiting" after a real accept) on any revisit.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const session = sessionData?.session;
  const professionalId = session?.professionalId || "";

  const { data: profileData, isLoading: professionalLoading } = useQuery({
    queryKey: ["/api/professionals", professionalId],
    queryFn: () => getProfessionalProfile(professionalId),
    enabled: !!professionalId,
  });

  const professional = profileData
    ? {
        name: profileData.profile.user?.fullName || "Professional",
        title: profileData.profile.specialization || "",
        image: profileData.profile.user?.profileImage || FALLBACK_AVATAR,
        rating: Number(profileData.profile.rating) || 0,
      }
    : { name: "", title: "", image: FALLBACK_AVATAR, rating: 0 };

  const sessionType = session?.type === "audio" ? "call" : (session?.type as "chat" | "video") || "chat";

  const [phase, setPhase] = useState<"waiting" | "declined" | "timeout" | "ready" | "live" | "ended">("waiting");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Mirrors wsRef.current for the live session connection specifically —
  // useWebRTCCall needs a value it can depend on in a useEffect, which a
  // ref can't provide.
  const [callWs, setCallWs] = useState<WebSocket | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // onclose fires with whatever `phase` closed over at connect time, not
  // the live value — mirrored into a ref so the reconnect decision reflects
  // reality (don't reconnect after the user/professional intentionally
  // ended the session).
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before every deliberate close() call so onclose can tell "we
  // hung up" apart from "the connection dropped" without racing against
  // phaseRef's state-update timing.
  const intentionalCloseRef = useRef(false);

  const plannedMinutes = session?.plannedDurationMinutes ?? 0;
  const price = session?.priceAtBooking ?? "0.00";

  const call = useWebRTCCall({
    ws: callWs,
    active: phase === "live" && sessionType !== "chat" && !!user?.id,
    withVideo: sessionType === "video",
    // The client always initiates the offer, the professional always answers
    // — see ProfessionalChat.tsx's mirrored isInitiator: false.
    isInitiator: true,
    myUserId: user?.id ?? "",
  });

  // Determine initial phase from the session's server status.
  useEffect(() => {
    if (!session) return;
    if (session.status === "pending") setPhase("waiting");
    else if (session.status === "scheduled") setPhase("ready");
    else if (session.status === "in_progress") setPhase("live");
    else if (session.status === "completed" || session.status === "cancelled") setPhase("ended");
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

  const connectWebSocket = useCallback(
    (roomId: string) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${roomId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      // Keeps useWebRTCCall's ws prop pointing at the live socket across a
      // reconnect too — signaling would otherwise keep sending over a
      // closed connection with no way to notice.
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

          if (data.type === "message" && data.userRole === "professional") {
            setMessages((prev) => [
              ...prev,
              { id: Date.now().toString(), sender: "professional", text: data.content || "", timestamp: new Date(data.timestamp!) },
            ]);
          } else if (data.type === "user_joined" && data.userRole === "professional") {
            setMessages((prev) => [
              ...prev.filter((m) => !m.text.includes("Waiting for")),
              {
                id: Date.now().toString(),
                sender: "professional",
                text: `Hello! I'm ${professional.name}. Thank you for connecting with me. How can I help you today?`,
                timestamp: new Date(),
              },
            ]);
            toast({ title: "Professional connected", description: `${professional.name} has joined the session.` });
          } else if (data.type === "user_left" && data.userRole === "professional") {
            setPhase("ended");
            intentionalCloseRef.current = true;
            wsRef.current?.close();
            toast({ title: "Session ended", description: `Duration: ${formatTime(sessionDuration)}` });
            persistSessionEnd();
          } else if (data.type === "message_failed") {
            // The server couldn't persist the last message we sent over this
            // socket — surfaced honestly instead of leaving it looking sent.
            toast({ title: "Message not sent", description: "Please try sending it again.", variant: "destructive" });
          }
        } catch (error) {
          console.error("WebSocket message parse error:", error);
        }
      };

      ws.onerror = (error) => console.error("WebSocket error:", error);

      // Previously a dropped connection (sleep, brief wifi loss) just sat
      // there — no reconnect attempt, no visible sign anything was wrong,
      // the other party's WS heartbeat eventually times it out server-side
      // and this tab looks "live" while actually being disconnected.
      ws.onclose = () => {
        if (intentionalCloseRef.current || phaseRef.current !== "live") return;
        if (reconnectAttemptRef.current === 0) {
          toast({ title: "Connection lost", description: "Reconnecting...", variant: "destructive" });
        }
        setIsReconnecting(true);
        const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30_000);
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(() => connectWebSocket(roomId), delay);
      };

      return ws;
    },
    [sessionDuration, persistSessionEnd, toast]
  );

  // While waiting for the professional to accept, react to the app-wide
  // inbox connection (mounted once in App.tsx) instead of opening a second
  // WebSocket to the same client_<userId> room — see useUserInboxSocket.
  useEffect(() => {
    if (phase !== "waiting") return;
    return onInboxEvent((data) => {
      if (data.type === "session_accepted") {
        toast({ title: "Request accepted!", description: `${professional.name} is ready to connect.` });
        setPhase("ready");
        refetchSession();
      } else if (data.type === "session_declined") {
        setPhase("declined");
        setRecommendations((data.recommendations as Recommendation[]) || []);
      } else if (data.type === "session_timeout") {
        setPhase("timeout");
        setRecommendations((data.recommendations as Recommendation[]) || []);
      }
    });
  }, [phase, professional.name, toast, refetchSession]);

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
    const ws = connectWebSocket(sessionId);
    setCallWs(ws);

    const placeholder: Message = {
      id: "1",
      sender: "professional",
      text: `Connecting to ${professional.name}...`,
      timestamp: new Date(),
    };
    try {
      // Restores the transcript from a previous connection to this same
      // session (a refresh, or reopening after the professional accepted) —
      // this used to always start blank since chat only ever lived in the
      // in-memory WS relay.
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
    const userMessage: Message = { id: Date.now().toString(), sender: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      return;
    }
    // The socket wasn't open (still connecting, briefly dropped) — previously
    // the message just vanished here with no error and no way to know it
    // hadn't gone anywhere. Falls back to a REST send, which persists the
    // same way and pushes it live to the professional if they're connected.
    try {
      await sendSessionMessageViaRest(sessionId, text);
    } catch {
      toast({ title: "Message not sent", description: "Please check your connection and try again.", variant: "destructive" });
    }
  };

  if (sessionLoading || professionalLoading) {
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
            <p>We couldn't find this booking.</p>
            <Link href="/therapists"><Button className="mt-4" variant="outline">Back to Professionals</Button></Link>
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
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10" onClick={() => setLocation("/therapists")} aria-label="Back to therapists">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={professional.image} alt={professional.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
                <div>
                  <h2 className="font-semibold text-sm">{professional.name}</h2>
                  <p className="text-xs opacity-80">{professional.title}</p>
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
          {phase === "waiting" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <img src={professional.image} alt={professional.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20" />
                <h2 className="text-2xl font-bold font-serif mb-1">{professional.name}</h2>
                <Loader2 className="w-6 h-6 animate-spin mx-auto my-4 text-primary" />
                <p className="text-muted-foreground">Waiting for {professional.name} to accept your request...</p>
                <p className="text-xs text-muted-foreground mt-2">Payment already confirmed — ₹{price}</p>
              </CardContent>
            </Card>
          )}

          {(phase === "declined" || phase === "timeout") && (
            <Card className="max-w-lg mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  {phase === "declined" ? "Request declined" : "No response in time"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {professional.name} {phase === "declined" ? "isn't able to accept this session right now." : "didn't respond in time."} Your payment has been refunded automatically.
                </p>
                {recommendations.length > 0 && (
                  <div className="text-left space-y-2 mb-6">
                    <p className="text-sm font-medium">Other online professionals:</p>
                    {recommendations.map((r) => (
                      <Link key={r.id} href={`/professionals/${r.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                          <img src={r.profileImage || FALLBACK_AVATAR} alt={r.fullName || "Professional"} className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <p className="text-sm font-medium">{r.fullName}</p>
                            <p className="text-xs text-muted-foreground">{r.specialization}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <Button onClick={() => setLocation("/therapists")} className="w-full">Back to Professionals</Button>
              </CardContent>
            </Card>
          )}

          {phase === "ready" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <img src={professional.image} alt={professional.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20" />
                <h2 className="text-2xl font-bold font-serif mb-1">{professional.name}</h2>
                <p className="text-muted-foreground mb-2">{professional.title}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{professional.rating}</span>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-6">
                  <div className="text-sm text-muted-foreground mb-1">Session</div>
                  <div className="text-2xl font-bold text-primary">₹{price}</div>
                  <div className="text-xs text-muted-foreground mt-1">{plannedMinutes} minutes — paid in full</div>
                </div>

                <Badge variant="secondary" className="mb-6">
                  {sessionType === "chat" ? "Text Chat" : sessionType === "call" ? "Voice Call" : "Video Call"}
                </Badge>

                <Button size="lg" className="w-full" onClick={joinSession}>
                  {sessionType === "chat" ? "Join Chat Session" : sessionType === "call" ? "Join Voice Call" : "Join Video Call"}
                </Button>
                {sessionType !== "chat" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    This call connects you directly with {professional.name.split(" ")[0] || "your professional"} and is not recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {phase === "ended" && (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-bold mb-2">Session ended</h2>
                <p className="text-muted-foreground mb-6">Thanks for using Focus. Duration: {formatTime(sessionDuration)}</p>
                <Link href="/profile"><Button className="w-full">Back to Profile</Button></Link>
              </CardContent>
            </Card>
          )}

          {phase === "live" && (
            <div className="flex flex-col h-[calc(100vh-180px)]">
              {(sessionType === "call" || sessionType === "video") && (
                <CallPanel
                  withVideo={sessionType === "video"}
                  peerName={professional.name}
                  peerAvatar={professional.image}
                  call={call}
                  onHangup={endSession}
                />
              )}

              <Card className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${message.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                      placeholder="Type your message..."
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
