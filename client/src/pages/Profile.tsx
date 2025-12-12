import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Award, Clock, Activity, BookOpen, Smile, Frown, Meh, Info, HelpCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function Profile() {
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
                  <img 
                    src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
                    alt="User" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-serif text-foreground">Aditya Kumar</h2>
                  <p className="text-muted-foreground">Focus Member since 2024</p>
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
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Monthly Goal</span>
                    <span className="font-bold">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
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
                  <p className="text-muted-foreground">Track your progress and mental wellness over time.</p>
                </div>
                <Link href="/formula-guide">
                  <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
                    <HelpCircle className="w-4 h-4" />
                    How is this calculated?
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-blue-500 shadow-sm shrink-0 mb-1">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">Current Streak</p>
                    <h3 className="text-2xl font-bold text-blue-900 break-words">5 Days</h3>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-purple-500 shadow-sm shrink-0 mb-1">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-purple-600 font-semibold mb-1">Total Badges</p>
                    <h3 className="text-2xl font-bold text-purple-900 break-words">8 Earned</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm overflow-hidden h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2 h-full">
                  <div className="p-3 bg-white rounded-full text-green-500 shadow-sm shrink-0 mb-1">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-xs uppercase tracking-wider text-green-600 font-semibold mb-1">Total Practice</p>
                    <h3 className="text-2xl font-bold text-green-900 break-words">12.5 Hrs</h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="mood" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
                <TabsTrigger value="mood">Mood Tracker</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
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
                      <Button variant="link" className="p-0 h-auto text-primary">Write new entry &rarr;</Button>
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
