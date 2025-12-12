import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import botAvatar from "@assets/generated_images/friendly_ai_chatbot_avatar.png";
import { Send, User } from "lucide-react";
import { useState } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hello! I'm your AI companion. I'm here to listen and support you. How are you feeling today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    // Simulate bot response
    setTimeout(() => {
      setMessages([...newMessages, { 
        role: "bot", 
        text: "Thank you for sharing that with me. I'm listening. Can you tell me more about what's making you feel that way?" 
      }]);
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 h-[calc(100vh-5rem)] flex flex-col">
        <div className="bg-card border rounded-3xl shadow-sm flex-grow flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
          
          {/* Chat Header */}
          <div className="p-6 border-b bg-muted/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-primary/20 p-1 overflow-hidden">
              <img src={botAvatar} alt="AI Bot" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-lg font-serif">Serene Companion</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" /> Online & Ready to Listen
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-grow p-6 bg-slate-50/50">
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-white border overflow-hidden shrink-0 mt-1">
                      <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className={`
                    max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white border rounded-tl-none'}
                  `}>
                    {msg.text}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="rounded-full bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary pl-6 py-6"
              />
              <Button 
                onClick={handleSend}
                size="icon" 
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              AI companion provides support but is not a replacement for professional therapy.
            </p>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
