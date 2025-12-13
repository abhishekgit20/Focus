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
import { Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: string;
  text: string;
  sanskrit?: string;
  purport?: string;
  source?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die', 
  'self harm', 'self-harm', 'hurt myself', 'cutting myself',
  'no reason to live', 'better off dead', 'death wish', 'ending it all',
  'आत्महत्या', 'मरना चाहता', 'मरना चाहती', 'जीना नहीं चाहता', 'खुद को मारना'
];

const CRISIS_RESPONSE = {
  text: `🚨 I'm very concerned about what you've shared. Your life matters, and help is available right now.

**Emergency Helplines (India):**
📞 iCall: 9152987821 (Mon-Sat, 8am-10pm)
📞 Vandrevala Foundation: 1860-2662-345 (24/7)
📞 NIMHANS: 080-46110007 (24/7)
📞 Snehi: 044-24640050 (24/7)

Please reach out immediately. If in danger, call 112. You are not alone. 💙`,
  source: "Crisis Support"
};

const checkForCrisis = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

const detectLanguage = (text: string): { lang: string; code: string } => {
  const langPatterns = [
    { pattern: /[\u0A00-\u0A7F]/, lang: 'Punjabi', code: 'pa-IN' },
    { pattern: /[\u0A80-\u0AFF]/, lang: 'Gujarati', code: 'gu-IN' },
    { pattern: /[\u0980-\u09FF]/, lang: 'Bengali', code: 'bn-IN' },
    { pattern: /[\u0B00-\u0B7F]/, lang: 'Odia', code: 'or-IN' },
    { pattern: /[\u0B80-\u0BFF]/, lang: 'Tamil', code: 'ta-IN' },
    { pattern: /[\u0C00-\u0C7F]/, lang: 'Telugu', code: 'te-IN' },
    { pattern: /[\u0C80-\u0CFF]/, lang: 'Kannada', code: 'kn-IN' },
    { pattern: /[\u0D00-\u0D7F]/, lang: 'Malayalam', code: 'ml-IN' },
    { pattern: /[\u0900-\u097F]/, lang: 'Hindi', code: 'hi-IN' },
  ];
  
  for (const { pattern, lang, code } of langPatterns) {
    if (pattern.test(text)) {
      return { lang, code };
    }
  }
  return { lang: 'English', code: 'en-IN' };
};

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "bot", 
      text: "Namaste! I am your companion for peace and clarity, powered by ChatGPT and the wisdom of the Bhagavad Gita. What is troubling your mind today?",
      source: "Gita Bot • Powered by ChatGPT"
    }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = useCallback((text: string, index: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      if (speakingIndex === index) {
        setSpeakingIndex(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      const detected = detectLanguage(text);
      utterance.lang = detected.code;
      
      const voices = window.speechSynthesis.getVoices();
      
      // Use a soothing female voice for the AI assistant
      const femaleVoicePatterns = ['female', 'samantha', 'zira', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'veena', 'lekha', 'sangeeta', 'priya', 'aditi'];
      
      // First try to find a female voice matching the language
      let selectedVoice = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        const matchesLang = v.lang.includes(detected.code) || v.lang.includes(detected.code.split('-')[0]);
        const matchesFemale = femaleVoicePatterns.some(pattern => nameLower.includes(pattern));
        return matchesLang && matchesFemale;
      });
      
      // If no female voice for language, try any female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const nameLower = v.name.toLowerCase();
          return femaleVoicePatterns.some(pattern => nameLower.includes(pattern));
        });
      }
      
      // Fallback to language-matched voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.includes(detected.code) || 
          v.lang.includes(detected.code.split('-')[0])
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);
      
      speechSynthRef.current = utterance;
      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
    }
  }, [speakingIndex]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      window.dispatchEvent(new Event('chat-widget-opened'));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    
    if (checkForCrisis(userMessage)) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: "bot", 
          text: CRISIS_RESPONSE.text,
          source: CRISIS_RESPONSE.source
        }]);
        setIsTyping(false);
      }, 500);
      return;
    }
    
    setIsTyping(true);

    try {
      const response = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      ]);

      setMessages(prev => [...prev, { 
        role: "bot", 
        text: data.response,
        source: data.bhagavadGitaReference 
          ? `Bhagavad Gita: ${data.bhagavadGitaReference}` 
          : "Focus Wisdom Bot • Powered by ChatGPT"
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: "bot", 
        text: "I apologize, but I'm having trouble connecting. Please try again.",
        source: "System Message"
      }]);
    } finally {
      setIsTyping(false);
    }
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
                Gita Bot <Sparkles className="w-4 h-4 text-primary" />
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Online • Powered by ChatGPT</p>
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
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.purport && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Insight:</strong> {msg.purport}
                    </p>
                  )}
                  {msg.role === 'bot' && (
                    <div className="flex items-center justify-between pt-1 border-t border-muted/30 mt-1">
                      <p className="text-[10px] text-muted-foreground italic">- {msg.source}</p>
                      <button
                        onClick={() => speakText(msg.text, i)}
                        className={`p-1 rounded-full transition-all ${
                          speakingIndex === i 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-primary/10 text-primary'
                        }`}
                        title={speakingIndex === i ? "Stop" : "Read aloud"}
                      >
                        {speakingIndex === i ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </div>
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
              disabled={isTyping}
            />
            <Button 
              type="submit"
              size="icon" 
              className="rounded-full bg-primary hover:bg-primary/90 shrink-0"
              disabled={!input.trim() || isTyping}
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
