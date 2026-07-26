import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import botAvatar from "@assets/generated_images/wisdom_chatbot_avatar.png";
import { Send, User, Sparkles, Loader2, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCompanionChat } from "@/hooks/useCompanionChat";
import { renderFormattedText } from "@/lib/chatFormatting";
import { AlertTriangle } from "lucide-react";

export default function Chatbot() {
  const { messages, isTyping, isLoadingHistory, sendMessage } = useCompanionChat({
    role: "bot",
    text: "Namaste! I am your companion for peace and clarity, powered by advanced AI and the wisdom of the Bhagavad Gita. Tell me what you are feeling—stress, anger, confusion, grief, or anything else weighing on your mind. I'm here to listen and offer guidance.",
    source: "Gita Bot • Powered by ChatGPT"
  });
  const [input, setInput] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

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
      
      // Final fallback to any Indian voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('-IN'));
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

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN,hi-IN'; // English and Hindi
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          toast({
            title: "Voice input received",
            description: "You can edit or send your message.",
            duration: 2000,
          });
        };
        
        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error !== 'no-speech') {
            toast({
              title: "Voice input unavailable",
              description: "You can still type your message.",
              duration: 3000,
            });
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, [toast]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isTyping) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
        toast({
          title: "Listening...",
          description: "Speak your message. I'm here to listen.",
          duration: 2000,
        });
      } catch (error) {
        setIsListening(false);
        toast({
          title: "Voice input unavailable",
          description: "You can still type your message.",
          duration: 3000,
        });
      }
    }
  }, [isListening, isTyping, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
      setIsListening(false);
    }
  }, [isListening]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Stop listening if active
    stopListening();

    const userMessage = input.trim();
    setInput("");
    await sendMessage(userMessage);
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
                Gita Bot <Sparkles className="w-4 h-4 text-primary" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Powered by ChatGPT & Ancient Indian Wisdom
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-grow bg-slate-50/50 relative z-10">
            <div className="p-6 space-y-6" ref={scrollRef}>
              {isLoadingHistory && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading your conversation...
                </div>
              )}
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
                      : msg.isCrisis
                      ? 'bg-destructive/5 border-2 border-destructive/40 rounded-tl-none text-foreground'
                      : 'bg-white border rounded-tl-none text-foreground'}
                  `}>
                    {msg.isCrisis && (
                      <div className="flex items-center gap-2 text-destructive font-semibold mb-2 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> Crisis Support
                      </div>
                    )}
                    {msg.sanskrit && (
                      <p className="font-serif text-primary/80 mb-2 italic text-xs border-l-2 border-primary/20 pl-2">
                        {msg.sanskrit}
                      </p>
                    )}
                    <p className="whitespace-pre-line">{renderFormattedText(msg.text, msg.isCrisis)}</p>
                    {msg.purport && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <strong>Insight:</strong> {msg.purport}
                      </p>
                    )}
                    {msg.role === 'bot' && (
                      <div className="mt-3 pt-3 border-t border-muted/50 text-xs text-muted-foreground italic flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {msg.source}
                        </span>
                        <button
                          onClick={() => speakText(msg.text, i)}
                          className={`p-1.5 rounded-full transition-all ${
                            speakingIndex === i 
                              ? 'bg-primary text-white' 
                              : 'hover:bg-primary/10 text-primary'
                          }`}
                          title={speakingIndex === i ? "Stop reading" : "Read aloud"}
                          data-testid={`button-speak-${i}`}
                        >
                          {speakingIndex === i ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    stopListening();
                    handleSend();
                  }
                }}
                placeholder="How are you feeling? (e.g. stressed, angry, confused)"
                className="rounded-full bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary pl-6 py-6"
                disabled={isTyping || isListening}
              />
              {recognitionRef.current && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  className={`w-12 h-12 rounded-full shrink-0 ${
                    isListening 
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                      : "border-muted-foreground/20 hover:bg-muted/50"
                  }`}
                  disabled={isTyping}
                  title={isListening ? "Stop listening" : "Voice input (optional)"}
                  aria-label={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              <Button
                onClick={handleSend}
                size="icon"
                className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shrink-0"
                disabled={isTyping || !input.trim() || isListening}
                aria-label="Send message"
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
