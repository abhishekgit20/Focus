import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Clock, 
  IndianRupee,
  ArrowLeft,
  User
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

export default function ProfessionalChat() {
  const [, params] = useRoute("/professional-chat/:sessionId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const sessionId = params?.sessionId || "";
  
  const [isConnected, setIsConnected] = useState(false);
  const [clientOnline, setClientOnline] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: user } = useQuery<{ id: number; username: string }>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
  });

  const connectWebSocket = useCallback(() => {
    if (!sessionId) return;
    
    const odId = user?.id || `pro_${Date.now()}`;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}&userId=${odId}&role=professional`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log("Professional WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      try {
        const data: WSIncoming = JSON.parse(event.data);
        
        if (data.type === "message" && data.userRole === "client") {
          const newMessage: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: data.content || "",
            timestamp: new Date(data.timestamp),
          };
          setMessages(prev => [...prev, newMessage]);
        } else if (data.type === "user_joined" && data.userRole === "client") {
          setClientOnline(true);
          toast({
            title: "Client Connected",
            description: "A client has joined the session.",
          });
        } else if (data.type === "user_left" && data.userRole === "client") {
          setClientOnline(false);
          toast({
            title: "Client Disconnected",
            description: "The client has left the session.",
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
  }, [user, sessionId, toast]);

  useEffect(() => {
    if (sessionId) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, connectWebSocket]);

  useEffect(() => {
    if (isConnected) {
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
  }, [isConnected]);

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

  const endSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    toast({
      title: "Session Ended",
      description: `Session duration: ${formatTime(sessionDuration)}`,
    });
    setLocation("/professional-dashboard");
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const professionalMessage: Message = {
      id: Date.now().toString(),
      sender: "professional",
      text: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, professionalMessage]);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        sessionId: sessionId,
        userId: user?.id?.toString() || "pro_guest",
        userRole: "professional",
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
                onClick={() => setLocation("/professional-dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Client Session</h2>
                  <p className="text-xs opacity-80">
                    {clientOnline ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      "Waiting for client..."
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? "default" : "secondary"} className="bg-white/10">
                {isConnected ? "Connected" : "Connecting..."}
              </Badge>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-sm" data-testid="text-session-duration">
                  {formatTime(sessionDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <Card className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Waiting for messages...</p>
                      <p className="text-sm mt-2">Messages from the client will appear here.</p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "professional" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.sender === "professional"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-${message.id}`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${message.sender === "professional" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                    placeholder="Type your response..."
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim()}
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex justify-center mt-4">
                  <Button 
                    variant="destructive" 
                    onClick={endSession}
                    data-testid="button-end-session"
                  >
                    End Session
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
