import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Send, 
  Clock, 
  IndianRupee,
  ArrowLeft,
  Star,
  Copy,
  Check
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Message {
  id: string;
  sender: "user" | "professional";
  text: string;
  timestamp: Date;
}

interface WSIncoming {
  type: "message" | "user_joined" | "user_left" | "typing";
  userId: string;
  userRole: "client" | "professional";
  content?: string;
  timestamp: string;
}

const DEMO_PROFESSIONALS: Record<string, {
  name: string;
  title: string;
  image: string;
  ratePerMinute: number;
  rating: number;
}> = {
  "1": {
    name: "Dr. Ananya Sharma",
    title: "Clinical Psychologist",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    ratePerMinute: 25,
    rating: 4.9,
  },
  "2": {
    name: "Guru Rajesh Kumar",
    title: "Yoga & Meditation Instructor",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200",
    ratePerMinute: 15,
    rating: 5.0,
  },
  "3": {
    name: "Dr. Arjun Mehta",
    title: "Psychiatrist",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200",
    ratePerMinute: 40,
    rating: 4.8,
  },
  "4": {
    name: "Priya Patel",
    title: "Therapist",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200",
    ratePerMinute: 20,
    rating: 4.9,
  },
};

export default function Consultation() {
  const [, params] = useRoute("/consultation/:professionalId/:type");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const professionalId = params?.professionalId || "1";
  const sessionType = (params?.type || "chat") as "chat" | "call" | "video";
  
  const professional = DEMO_PROFESSIONALS[professionalId] || DEMO_PROFESSIONALS["1"];
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(sessionType === "video");
  const [isConnected, setIsConnected] = useState(false);
  const [professionalOnline, setProfessionalOnline] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>("");
  
  // Get current user
  const { data: user } = useQuery<{ id: number; username: string }>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
  });
  
  // Generate stable session ID - based on professional and timestamp
  useEffect(() => {
    if (!sessionIdRef.current) {
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      sessionIdRef.current = `chat_${professionalId}_${uniqueId}`;
    }
  }, [professionalId]);
  
  const totalCost = ((sessionDuration / 60) * professional.ratePerMinute).toFixed(2);
  
  // WebSocket connection handler
  const connectWebSocket = useCallback(() => {
    const odId = user?.id || `guest_${Date.now()}`;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionIdRef.current}&userId=${odId}&role=client`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      try {
        const data: WSIncoming = JSON.parse(event.data);
        
        if (data.type === "message" && data.userRole === "professional") {
          const newMessage: Message = {
            id: Date.now().toString(),
            sender: "professional",
            text: data.content || "",
            timestamp: new Date(data.timestamp),
          };
          setMessages(prev => [...prev, newMessage]);
        } else if (data.type === "user_joined" && data.userRole === "professional") {
          setProfessionalOnline(true);
          // Replace the waiting message with a connected message
          setMessages(prev => {
            const filtered = prev.filter(m => !m.text.includes("Waiting for"));
            return [...filtered, {
              id: Date.now().toString(),
              sender: "professional" as const,
              text: `Hello! I'm ${professional.name}. Thank you for connecting with me. How can I help you today?`,
              timestamp: new Date(),
            }];
          });
          toast({
            title: "Professional Connected",
            description: `${professional.name} has joined the session.`,
          });
        } else if (data.type === "user_left" && data.userRole === "professional") {
          setProfessionalOnline(false);
          setIsSessionActive(false); // End the session and stop timer
          if (wsRef.current) {
            wsRef.current.close();
          }
          toast({
            title: "Session Ended",
            description: `${professional.name} has ended the session.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    return ws;
  }, [user, professional.name, toast]);
  
  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startSession = () => {
    setIsSessionActive(true);
    connectWebSocket();
    setMessages([{
      id: "1",
      sender: "professional",
      text: `Waiting for ${professional.name} to connect...`,
      timestamp: new Date(),
    }]);
    toast({
      title: "Session Started",
      description: `You're now connected. Waiting for ${professional.name} to join. Billing starts at ₹${professional.ratePerMinute}/min.`,
    });
  };

  const endSession = () => {
    setIsSessionActive(false);
    if (wsRef.current) {
      wsRef.current.close();
    }
    toast({
      title: "Session Ended",
      description: `Total duration: ${formatTime(sessionDuration)}. Total cost: ₹${totalCost}`,
    });
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !isSessionActive) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        sessionId: sessionIdRef.current,
        userId: user?.id?.toString() || "guest",
        userRole: "client",
        content: inputMessage,
      }));
    }
    
    setInputMessage("");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30">
        <div className="bg-primary text-primary-foreground py-4 px-4 sticky top-0 z-10">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-white/10"
                onClick={() => setLocation("/therapists")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img 
                  src={professional.image} 
                  alt={professional.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                />
                <div>
                  <h2 className="font-semibold text-sm">{professional.name}</h2>
                  <p className="text-xs opacity-80">
                    {professionalOnline ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      professional.title
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            {isSessionActive && (
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <button 
                  className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full cursor-pointer hover:bg-blue-500/30 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(sessionIdRef.current);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast({
                      title: "Session ID Copied",
                      description: "Share this with your professional to let them join.",
                    });
                  }}
                  data-testid="button-copy-session-id"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="font-mono text-xs" data-testid="text-session-id">
                    {sessionIdRef.current.slice(0, 20)}...
                  </span>
                </button>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-sm" data-testid="text-session-duration">{formatTime(sessionDuration)}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
                  <IndianRupee className="w-4 h-4" />
                  <span className="font-mono text-sm" data-testid="text-session-cost">₹{totalCost}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {!isSessionActive ? (
            <Card className="max-w-md mx-auto mt-12">
              <CardContent className="p-8 text-center">
                <img 
                  src={professional.image} 
                  alt={professional.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20"
                />
                <h2 className="text-2xl font-bold font-serif mb-1">{professional.name}</h2>
                <p className="text-muted-foreground mb-2">{professional.title}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{professional.rating}</span>
                </div>
                
                <div className="bg-muted rounded-lg p-4 mb-6">
                  <div className="text-sm text-muted-foreground mb-1">Session Rate</div>
                  <div className="text-2xl font-bold text-primary">₹{professional.ratePerMinute}/min</div>
                </div>
                
                <Badge variant="secondary" className="mb-6">
                  {sessionType === "chat" ? "Text Chat" : sessionType === "call" ? "Voice Call" : "Video Call"}
                </Badge>
                
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={startSession}
                  data-testid="button-start-session"
                >
                  {sessionType === "chat" ? "Start Chat Session" : sessionType === "call" ? "Start Voice Call" : "Start Video Call"}
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Amount will be deducted from your wallet based on session duration
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col h-[calc(100vh-180px)]">
              {(sessionType === "call" || sessionType === "video") && (
                <div className="bg-slate-900 rounded-2xl p-8 mb-4 flex flex-col items-center justify-center min-h-[300px]">
                  {sessionType === "video" && isVideoOn ? (
                    <div className="w-full aspect-video bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                      <img 
                        src={professional.image} 
                        alt={professional.name}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <img 
                      src={professional.image} 
                      alt={professional.name}
                      className="w-32 h-32 rounded-full object-cover mb-4"
                    />
                  )}
                  <h3 className="text-white text-xl font-semibold mb-2">{professional.name}</h3>
                  <p className="text-white/60 mb-6">
                    {sessionType === "video" ? "Video call in progress..." : "Voice call in progress..."}
                  </p>
                  
                  <div className="flex gap-4">
                    <Button
                      variant={isMuted ? "destructive" : "secondary"}
                      size="icon"
                      className="rounded-full w-12 h-12"
                      onClick={() => setIsMuted(!isMuted)}
                      data-testid="button-mute"
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    
                    {sessionType === "video" && (
                      <Button
                        variant={isVideoOn ? "secondary" : "destructive"}
                        size="icon"
                        className="rounded-full w-12 h-12"
                        onClick={() => setIsVideoOn(!isVideoOn)}
                        data-testid="button-video"
                      >
                        {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full w-12 h-12"
                      onClick={endSession}
                      data-testid="button-end-call"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
              
              <Card className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.sender === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          data-testid={`message-${message.id}`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${message.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      disabled={!isSessionActive}
                      data-testid="input-message"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!isSessionActive || !inputMessage.trim()}
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {sessionType === "chat" && (
                    <div className="flex justify-center mt-4">
                      <Button 
                        variant="destructive" 
                        onClick={endSession}
                        data-testid="button-end-session"
                      >
                        End Session
                      </Button>
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
