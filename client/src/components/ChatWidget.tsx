import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import botAvatar from "@assets/generated_images/wisdom_chatbot_avatar.png";
import { Send, User, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { generateAIResponse } from "@/lib/gitaData";

interface Message {
  role: string;
  text: string;
  sanskrit?: string;
  purport?: string;
  source?: string;
}

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "bot", 
      text: "Namaste! I am your companion for peace and clarity. I can offer guidance based on the wisdom of the Bhagavad Gita and ancient mindfulness practices. What is troubling your mind today?",
      source: "Gita Bot"
    }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Dispatch event when opened
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      window.dispatchEvent(new Event('chat-widget-opened'));
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Simulate bot response with Gita wisdom using shared logic
    const thinkingTime = Math.random() * 1000 + 1500; // 1.5s - 2.5s

    setTimeout(() => {
      const response = generateAIResponse(input);
      
      setMessages(prev => [...prev, { 
        role: "bot", 
        text: response.text,
        sanskrit: response.sanskrit,
        purport: response.purport,
        source: response.source
      }]);
      setIsTyping(false);
    }, thinkingTime);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 text-primary-foreground animate-in zoom-in duration-300"
        >
          <img src={botAvatar} alt="Chat" className="w-10 h-10 rounded-full object-cover" />
          <span className="sr-only">Open Chat</span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col border-l-0 sm:border-l">
        <SheetHeader className="px-6 py-4 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-primary/20 p-0.5 overflow-hidden shadow-sm">
              <img src={botAvatar} alt="Gita Bot" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-lg font-serif flex items-center gap-2">
                Focus Wisdom Bot <Sparkles className="w-4 h-4 text-primary" />
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Online • Ancient Wisdom AI</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-grow p-4 bg-slate-50/50">
          <div className="space-y-4" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-white border overflow-hidden shrink-0 mt-1">
                    <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className={`
                  max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm flex flex-col gap-2
                  ${msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-white border rounded-tl-none text-foreground'}
                `}>
                  {msg.sanskrit && (
                    <p className="font-serif text-primary/80 italic text-xs border-l-2 border-primary/20 pl-2">
                      {msg.sanskrit}
                    </p>
                  )}
                  <p>{msg.text}</p>
                  {msg.purport && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Insight:</strong> {msg.purport}
                    </p>
                  )}
                  {msg.source && (
                    <p className="text-[10px] text-muted-foreground text-right italic">- {msg.source}</p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                 <div className="w-6 h-6 rounded-full bg-white border overflow-hidden shrink-0 mt-1">
                    <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-white border rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-white">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for guidance..."
              className="rounded-full bg-muted/30 focus-visible:ring-primary pl-4"
            />
            <Button 
              type="submit"
              size="icon" 
              className="rounded-full bg-primary hover:bg-primary/90 shrink-0"
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            AI provides spiritual guidance, not medical advice.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
