import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Award, Clock, Activity, BookOpen, Smile, Frown, Meh, Info, HelpCircle, PenLine, Lightbulb, ChevronLeft, ChevronRight, History, Video, Phone, MessageSquare, Loader2, Heart, Flower } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const MOOD_DATA = [
  { day: "Mon", score: 6 },
  { day: "Tue", score: 7 },
  { day: "Wed", score: 5 },
  { day: "Thu", score: 8 },
  { day: "Fri", score: 7 },
  { day: "Sat", score: 9 },
  { day: "Sun", score: 8 },
];

const ACTIVITY_DATA = [
  { day: "Mon", mins: 15 },
  { day: "Tue", mins: 30 },
  { day: "Wed", mins: 20 },
  { day: "Thu", mins: 45 },
  { day: "Fri", mins: 30 },
  { day: "Sat", mins: 60 },
  { day: "Sun", mins: 45 },
];

const WELLNESS_FACTS = [
  {
    fact: "Just 10 minutes of daily meditation can reduce anxiety by up to 30%.",
    category: "Meditation",
    icon: "🧘"
  },
  {
    fact: "Gratitude journaling for 2 weeks can increase happiness levels for up to 6 months.",
    category: "Journaling",
    icon: "📝"
  },
  {
    fact: "Regular deep breathing exercises can lower cortisol levels by 20%.",
    category: "Breathing",
    icon: "🌬️"
  },
  {
    fact: "Walking in nature for 20 minutes reduces stress hormones more effectively than urban walks.",
    category: "Nature",
    icon: "🌿"
  },
  {
    fact: "Social connections are as important for longevity as exercise and diet.",
    category: "Connection",
    icon: "🤝"
  },
  {
    fact: "Getting 7-9 hours of sleep improves emotional regulation by 40%.",
    category: "Sleep",
    icon: "😴"
  },
  {
    fact: "Practicing mindfulness can physically increase gray matter in the brain.",
    category: "Mindfulness",
    icon: "🧠"
  },
  {
    fact: "Laughing for 15 minutes a day can burn up to 40 calories and boost immunity.",
    category: "Joy",
    icon: "😄"
  }
];

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isUserLoading, isAuthenticated } = useAuth();
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isUserLoading && user && user.role === 'admin') {
      // Redirect admin users to admin dashboard
      setLocation("/admin/feedback");
    }
  }, [isUserLoading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % WELLNESS_FACTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  useEffect(() => {
    const fetchSessionHistory = async () => {
      setIsLoadingSessions(true);
      try {
        const response = await fetch('/api/sessions', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSessionHistory(data.sessions || []);
        }
      } catch (error) {
        console.error('Failed to fetch session history:', error);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessionHistory();
  }, []);

  const goToPrevFact = () => {
    setIsAutoRotating(false);
    setCurrentFactIndex((prev) => (prev - 1 + WELLNESS_FACTS.length) % WELLNESS_FACTS.length);
  };

  const goToNextFact = () => {
    setIsAutoRotating(false);
    setCurrentFactIndex((prev) => (prev + 1) % WELLNESS_FACTS.length);
  };

  const goToFact = (index: number) => {
    setIsAutoRotating(false);
    setCurrentFactIndex(index);
  };

  const handleSaveJournal = () => {
    if (!journalEntry.trim()) return;
    
    toast({
      title: "Journal Entry Saved",
      description: "You earned +20 XP for your reflection!",
    });
    setJournalEntry("");
    setSelectedMood("");
    setIsJournalOpen(false);
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Sidebar / User Info */}
          <div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
            <Card className="overflow-hidden border-none shadow-lg">
              <div className="h-32 bg-gradient-to-r from-orange-100 to-orange-200"></div>
              <div className="px-6 pb-6 relative text-center pt-16">
                <div className="w-24 h-24 rounded-full bg-white p-1 absolute -top-12 left-1/2 -translate-x-1/2 shadow-md">
                  <Avatar className="w-full h-full">
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {user?.fullName 
                        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  {isUserLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold font-serif text-foreground">{user?.fullName || "User"}</h2>
                      <p className="text-muted-foreground">
                        Focus Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
                      </p>
                    </>
                  )}
                  <div className="flex gap-2 mt-4 justify-center items-center">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">Premium</Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="cursor-help flex items-center gap-1">
                            Level 5 <Info className="w-3 h-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Earned by consistent practice and journaling.</p>
                          <p className="text-xs text-muted-foreground mt-1">Next level: 250 points</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your wellbeing snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">This month's self-care</span>
                    <span className="font-bold">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-[10px] text-muted-foreground mt-1 cursor-help">Progress is personal — there's no right pace</p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This reflects your journey, not a target to meet. Every step forward is meaningful.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-muted/30 p-3 rounded-xl text-center">
                    <div className="text-2xl font-bold text-primary">12</div>
                    <div className="text-xs text-muted-foreground">Sessions</div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-600">240</div>
                    <div className="text-xs text-muted-foreground">Minutes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Main Content */}
          <div className="flex-1 w-full space-y-8">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold font-serif mb-2 text-foreground">My Journey</h1>
                  <p className="text-muted-foreground">Your path to wellbeing, at your own pace.</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/formula-guide">
                        <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
                          <HelpCircle className="w-4 h-4" />
                          How is this calculated?
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs mb-1">Learn how we track your journey.</p>
                      <p className="text-xs text-muted-foreground italic">Remember: Progress is personal. There's no right pace — only what feels right for you.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Affirming Supportive Text */}
              <Card className="mt-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground/80 italic leading-relaxed">
                    {user?.fullName ? (
                      <>You're showing up for yourself, {user.fullName.split(' ')[0]} — that matters. Progress isn't linear, and that's okay.</>
                    ) : (
                      <>You're showing up for yourself — that matters. Progress isn't linear, and that's okay.</>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-blue-500 shadow-sm shrink-0 mb-1">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">Self-care streak</p>
                    <h3 className="text-2xl font-bold text-blue-900 break-words">5 Days</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-[10px] text-blue-600/70 mt-1 cursor-help">Your personal pace matters</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Every day you show up is meaningful. There's no right pace — only what feels right for you.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-purple-500 shadow-sm shrink-0 mb-1">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-purple-600 font-semibold mb-1">Moments of growth</p>
                    <h3 className="text-2xl font-bold text-purple-900 break-words">8 Moments</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-[10px] text-purple-600/70 mt-1 cursor-help">Each one matters</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">These represent moments you've invested in yourself. Every small step counts.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-green-500 shadow-sm shrink-0 mb-1">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-green-600 font-semibold mb-1">Time invested in you</p>
                    <h3 className="text-2xl font-bold text-green-900 break-words">12.5 Hours</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-[10px] text-green-600/70 mt-1 cursor-help">Your wellbeing journey</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">This is time you've dedicated to caring for yourself. Every moment is valuable.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Next Gentle Step Section */}
            <Card className="bg-gradient-to-br from-orange-50 via-peach-50 to-amber-50 border-orange-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif flex items-center gap-2 text-orange-900">
                  <Heart className="w-5 h-5 text-orange-600" />
                  Today's gentle suggestion
                </CardTitle>
                <CardDescription className="text-orange-700">Choose what feels right for you — all optional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <Link href="/chatbot">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 bg-white/80 hover:bg-white border-gray-200 hover:border-orange-300 transition-all">
                      <MessageSquare className="w-5 h-5 text-gray-700" />
                      <div className="text-left">
                        <div className="font-semibold text-sm text-gray-900">Continue your chat</div>
                        <div className="text-xs text-gray-600">Pick up where you left off</div>
                      </div>
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-4 bg-white/80 hover:bg-white border-gray-200 hover:border-orange-300 transition-all"
                    onClick={() => {
                      toast({
                        title: "Take a moment",
                        description: "Breathe in for 4 counts, hold for 4, breathe out for 4. Repeat 3 times.",
                        duration: 5000,
                      });
                    }}
                  >
                    <Flower className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-semibold text-sm text-gray-900">Quick breathing</div>
                      <div className="text-xs text-gray-600">A few moments of calm</div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-auto py-4 bg-white/80 hover:bg-white border-gray-200 hover:border-orange-300 transition-all"
                    onClick={() => setIsJournalOpen(true)}
                  >
                    <PenLine className="w-5 h-5 text-gray-700" />
                    <div className="text-left">
                      <div className="font-semibold text-sm text-gray-900">One journal line</div>
                      <div className="text-xs text-gray-600">Just a thought or feeling</div>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-gray-500 italic text-center pt-3">
                  These are suggestions, not requirements. Listen to what you need today.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50" data-testid="did-you-know-section">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-200/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold font-serif text-amber-900">Did You Know?</h3>
                  </div>
                  <Badge variant="outline" className="bg-white/70 text-amber-700 border-amber-200" data-testid="fact-category">
                    {WELLNESS_FACTS[currentFactIndex].category}
                  </Badge>
                </div>
                
                <div className="relative min-h-[80px] flex items-center">
                  <button 
                    onClick={goToPrevFact}
                    className="absolute -left-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm border border-amber-100 text-amber-600 hover:text-amber-800 transition-all"
                    aria-label="Previous fact"
                    data-testid="button-prev-fact"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFactIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 px-8 text-center"
                    >
                      <span className="text-3xl mb-2 block">{WELLNESS_FACTS[currentFactIndex].icon}</span>
                      <p className="text-base text-amber-900 font-medium leading-relaxed" data-testid="text-wellness-fact">
                        {WELLNESS_FACTS[currentFactIndex].fact}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  
                  <button 
                    onClick={goToNextFact}
                    className="absolute -right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm border border-amber-100 text-amber-600 hover:text-amber-800 transition-all"
                    aria-label="Next fact"
                    data-testid="button-next-fact"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-center gap-1.5 mt-4">
                  {WELLNESS_FACTS.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToFact(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentFactIndex 
                          ? 'bg-amber-500 w-6' 
                          : 'bg-amber-200 hover:bg-amber-300'
                      }`}
                      aria-label={`Go to fact ${index + 1}`}
                      data-testid={`button-fact-dot-${index}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="mood" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-[500px] mb-6">
                <TabsTrigger value="mood">Mood Tracker</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
                <TabsTrigger value="sessions" className="gap-1">
                  <History className="w-3 h-3" /> Sessions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="mood" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Weekly Mood Analysis</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold mb-1">Mood Score Calculation</p>
                            <ul className="text-xs space-y-1">
                              <li><span className="font-medium text-green-600">8-10:</span> Great (Positive)</li>
                              <li><span className="font-medium text-yellow-600">4-7:</span> Okay (Neutral)</li>
                              <li><span className="font-medium text-red-600">1-3:</span> Stressed (Needs Care)</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CardDescription>How you've been feeling this week</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOOD_DATA}>
                        <defs>
                          <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF9933" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#FF9933" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 10]} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#FF9933" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorMood)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base">Today's Check-in</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2">
                        <button className="group flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
                          <div className="p-1.5 rounded-full bg-red-100 text-red-500 group-hover:scale-110 transition-transform shadow-sm">
                            <Frown className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-red-600 uppercase">Stressed</span>
                        </button>

                        <button className="group flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-transparent hover:border-yellow-200 hover:bg-yellow-50 transition-all cursor-pointer">
                          <div className="p-1.5 rounded-full bg-yellow-100 text-yellow-600 group-hover:scale-110 transition-transform shadow-sm">
                            <Meh className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-yellow-700 uppercase">Okay</span>
                        </button>

                        <button className="group flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-transparent hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer">
                          <div className="p-1.5 rounded-full bg-green-100 text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                            <Smile className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-green-700 uppercase">Great</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base">Journal Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground italic mb-3">
                        "Today I felt a bit anxious about work, but the breathing exercise really helped center me."
                      </p>
                      
                      <Dialog open={isJournalOpen} onOpenChange={setIsJournalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto text-primary gap-1">
                            Write new entry <PenLine className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Daily Reflection</DialogTitle>
                            <DialogDescription>
                              Journaling helps clear the mind. How are you feeling right now?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="mood">Current Mood</Label>
                              <div className="flex gap-2">
                                {['Stressed', 'Okay', 'Good', 'Great'].map((m) => (
                                  <Badge 
                                    key={m} 
                                    variant="outline" 
                                    className={`cursor-pointer px-3 py-1 transition-all ${
                                      selectedMood === m 
                                        ? 'bg-primary text-primary-foreground border-primary' 
                                        : 'hover:bg-primary/10'
                                    }`}
                                    onClick={() => setSelectedMood(m)}
                                  >
                                    {m}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="entry">Your Thoughts</Label>
                              <Textarea 
                                id="entry" 
                                placeholder="I am feeling..." 
                                className="min-h-[150px]"
                                value={journalEntry}
                                onChange={(e) => setJournalEntry(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleSaveJournal} className="rounded-full">Save Entry (+20 XP)</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Meditation Minutes</CardTitle>
                    <CardDescription>Time spent in mindfulness practice</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ACTIVITY_DATA}>
                        <defs>
                          <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <RechartsTooltip />
                        <Area 
                          type="monotone" 
                          dataKey="mins" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorActivity)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" /> Session History
                    </CardTitle>
                    <CardDescription>Your past consultations with professionals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSessions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : sessionHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">No sessions yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Your consultation history will appear here</p>
                        <Link href="/therapists">
                          <Button className="mt-4 rounded-full">Book Your First Session</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessionHistory.map((session, i) => (
                          <div 
                            key={session.id || i} 
                            className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                            data-testid={`session-history-item-${i}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full ${
                                session.status === 'completed' 
                                  ? 'bg-green-100 text-green-600' 
                                  : session.status === 'cancelled'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-blue-100 text-blue-600'
                              }`}>
                                {session.type === 'video' ? <Video className="w-5 h-5" /> :
                                 session.type === 'audio' ? <Phone className="w-5 h-5" /> :
                                 <MessageSquare className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {session.type?.charAt(0).toUpperCase() + session.type?.slice(1)} Session
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {session.scheduledAt 
                                    ? new Date(session.scheduledAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'Date not available'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={session.status === 'completed' ? 'default' : 'outline'}
                                className={
                                  session.status === 'completed' 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : session.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : ''
                                }
                              >
                                {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
                              </Badge>
                              {session.durationMinutes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {session.durationMinutes} mins
                                </p>
                              )}
                              {session.totalCost && (
                                <p className="text-sm font-medium text-primary">
                                  ₹{parseFloat(session.totalCost).toFixed(0)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <h2 className="text-xl font-bold font-serif">Upcoming Sessions</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { title: "Therapy Session", with: "Dr. Ananya Sharma", time: "Today, 5:00 PM", type: "Video Call" },
                      { title: "Yoga for Anxiety", with: "Guru Rajesh", time: "Tomorrow, 7:00 AM", type: "Live Class" },
                    ].map((session, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-full text-primary">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold">{session.title}</h4>
                            <p className="text-sm text-muted-foreground">with {session.with}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{session.time}</p>
                          <Badge variant="outline" className="mt-1">{session.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
