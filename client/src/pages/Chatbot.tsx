import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import botAvatar from "@assets/generated_images/wisdom_chatbot_avatar.png";
import { Send, User, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GITA_VERSES, FALLBACK_QUOTES, generateAIResponse } from "@/lib/gitaData";

interface Message {
  role: string;
  text: string;
  sanskrit?: string;
  purport?: string;
  source?: string;
  isThinking?: boolean;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "bot", 
      text: "Namaste! I am your companion for peace and clarity. I can offer guidance based on the wisdom of the Bhagavad Gita. Tell me what you are feeling—stress, anger, confusion, grief, or anything else weighing on your mind.",
      source: "Gita Bot"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]); // Scroll when typing starts too

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI "thinking" process with variable delay
    const thinkingTime = Math.random() * 1000 + 1500; // 1.5s - 2.5s
    
    setTimeout(async () => {
      // Use shared logic to find wisdom
      const response = generateAIResponse(input);
      
      const botResponse = {
        role: "bot",
        text: response.text,
        sanskrit: response.sanskrit,
        purport: response.purport,
        source: response.source
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, thinkingTime);
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-5rem)] flex flex-col">
        <div className="bg-card border rounded-3xl shadow-sm flex-grow flex flex-col overflow-hidden max-w-4xl mx-auto w-full relative">
          
          {/* Decorative background element */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

          {/* Chat Header */}
          <div className="p-6 border-b bg-primary/5 flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-primary/20 p-1 overflow-hidden shadow-sm">
              <img src={botAvatar} alt="Gita Bot" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h2 className="font-bold text-xl font-serif text-primary flex items-center gap-2">
                Focus Wisdom Bot <Sparkles className="w-4 h-4 text-primary" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Powered by Ancient Indian Wisdom & AI
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-grow bg-slate-50/50 relative z-10">
            <div className="p-6 space-y-6" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-white border overflow-hidden shrink-0 mt-1">
                      <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className={`
                    max-w-[85%] rounded-2xl p-5 text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white border rounded-tl-none text-foreground'}
                  `}>
                    {msg.sanskrit && (
                      <p className="font-serif text-primary/80 mb-2 italic text-xs border-l-2 border-primary/20 pl-2">
                        {msg.sanskrit}
                      </p>
                    )}
                    <p>{msg.text}</p>
                    {msg.purport && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <strong>Insight:</strong> {msg.purport}
                      </p>
                    )}
                    {msg.role === 'bot' && (
                      <div className="mt-3 pt-3 border-t border-muted/50 text-xs text-muted-foreground italic flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {msg.source}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-4 justify-start">
                   <div className="w-8 h-8 rounded-full bg-white border overflow-hidden shrink-0 mt-1">
                      <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white relative z-10">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="How are you feeling? (e.g. stressed, angry, confused)"
                className="rounded-full bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary pl-6 py-6"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSend}
                size="icon" 
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shrink-0"
                disabled={isTyping || !input.trim()}
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Our AI provides spiritual guidance but is not a substitute for clinical therapy.
            </p>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
