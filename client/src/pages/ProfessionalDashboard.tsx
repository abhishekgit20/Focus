import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Wallet, 
  MessageSquare, 
  Video, 
  Clock, 
  TrendingUp, 
  Star,
  Bell,
  Settings,
  ShieldCheck,
  Loader2,
  Phone
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import dashboardImg from "@assets/generated_images/professional_therapist_dashboard_with_analytics_and_appointments.png";
import complianceBadge from "@assets/generated_images/secure_medical_data_privacy_compliance_shield_badge.png";

interface DashboardStats {
  todayEarnings: string;
  totalSessions: number;
  upcomingSessions: number;
  pendingSessions: number;
  avgRating: string;
  totalReviews: number;
  profileViews: number;
}

interface WalletData {
  totalEarnings: string;
  pendingEarnings: string;
  availableBalance: string;
}

interface SessionData {
  id: string;
  clientId: string;
  scheduledAt: string;
  sessionType: string;
  status: string;
  client?: {
    fullName: string;
    profileImage?: string;
  };
}

interface ProfessionalProfileData {
  profile: {
    specialization: string;
    qualification?: string;
    experience?: number;
  };
  user: {
    id: string;
    fullName: string;
    profileImage?: string;
  };
}

export default function ProfessionalDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading: isUserLoading } = useAuth();

  const { data: profileData, isLoading: isProfileLoading } = useQuery<ProfessionalProfileData>({
    queryKey: ['/api/professional/profile'],
    queryFn: async () => {
      const res = await fetch('/api/professional/profile', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!currentUser, // Only fetch if user is authenticated
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/professional/stats'],
    queryFn: async () => {
      const res = await fetch('/api/professional/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/professional/wallet'],
    queryFn: async () => {
      const res = await fetch('/api/professional/wallet', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{ sessions: SessionData[] }>({
    queryKey: ['/api/professional/sessions/today'],
    queryFn: async () => {
      const res = await fetch('/api/professional/sessions/today', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
  });

  const displayStats = [
    { 
      label: "Today's Earnings", 
      value: stats ? `₹${stats.todayEarnings}` : "₹0", 
      change: "+12%", 
      icon: Wallet, 
      color: "text-green-600 bg-green-100" 
    },
    { 
      label: "Total Sessions", 
      value: stats?.totalSessions?.toString() || "0", 
      change: `${stats?.pendingSessions || 0} pending`, 
      icon: Video, 
      color: "text-blue-600 bg-blue-100" 
    },
    { 
      label: "Profile Views", 
      value: stats?.profileViews?.toString() || "0", 
      change: "+24%", 
      icon: Users, 
      color: "text-purple-600 bg-purple-100" 
    },
    { 
      label: "Avg. Rating", 
      value: stats?.avgRating || "5.0", 
      change: `${stats?.totalReviews || 0} reviews`, 
      icon: Star, 
      color: "text-yellow-600 bg-yellow-100" 
    },
  ];

  const upcomingSessions = sessionsData?.sessions || [];

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20 flex">
        <aside className="w-64 bg-background border-r hidden md:flex flex-col fixed h-[calc(100vh-64px)] top-16">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {profileData?.user?.fullName 
                    ? profileData.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : currentUser?.fullName 
                      ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'P'}
                </AvatarFallback>
              </Avatar>
              <div>
                {isProfileLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-sm">{profileData?.user?.fullName || currentUser?.fullName || "Professional"}</h3>
                    <p className="text-xs text-muted-foreground">{profileData?.profile?.specialization || "Professional"}</p>
                  </>
                )}
              </div>
            </div>
            
            <nav className="space-y-2">
              <Button variant="secondary" className="w-full justify-start gap-3 font-medium" data-testid="nav-dashboard">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-appointments">
                <Calendar className="w-4 h-4" /> Appointments
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-patients">
                <Users className="w-4 h-4" /> My Patients
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-earnings">
                <Wallet className="w-4 h-4" /> Earnings
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-messages">
                <MessageSquare className="w-4 h-4" /> Messages
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-analytics">
                <TrendingUp className="w-4 h-4" /> Analytics
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground" data-testid="nav-settings">
                <Settings className="w-4 h-4" /> Settings
              </Button>
            </nav>
          </div>
          
          <div className="p-6 border-t bg-blue-50/50">
            <div className="flex items-center gap-3 mb-3">
              <img src={complianceBadge} alt="HIPAA Compliant" className="w-10 h-10 object-contain" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">Privacy Compliant</h4>
                <p className="text-[10px] text-blue-700">DISHA & HIPAA Standards</p>
              </div>
            </div>
            <Button variant="link" className="h-auto p-0 text-[10px] text-blue-600 underline">
              View Data Policy
            </Button>
          </div>

          <div className="mt-auto p-6 border-t bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Availability</span>
              <Switch checked={isOnline} onCheckedChange={setIsOnline} data-testid="switch-availability" />
            </div>
            <p className="text-xs text-muted-foreground">
              {isOnline ? "You are visible to clients" : "You are currently offline"}
            </p>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif" data-testid="text-dashboard-title">Dashboard</h1>
                <p className="text-muted-foreground" data-testid="text-welcome-message">
                  Welcome back, {profileData?.user?.fullName?.split(' ')[0] || currentUser?.fullName?.split(' ')[0] || "Professional"}. You have {stats?.upcomingSessions || 0} upcoming sessions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-full" data-testid="button-notifications">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button className="rounded-full gap-2 bg-primary" data-testid="button-schedule-break">
                  <Clock className="w-4 h-4" /> Schedule Break
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                <div className="col-span-4 flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                displayStats.map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-stat-${i}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <Badge variant="outline" className="font-normal">
                          {stat.change}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>Your appointments for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessionsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : upcomingSessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No sessions scheduled for today</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingSessions.slice(0, 5).map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-transparent hover:border-primary/20 transition-all" data-testid={`session-${session.id}`}>
                            <div className="flex items-center gap-4">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {session.client?.fullName 
                                    ? session.client.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    : 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-bold">{session.client?.fullName || 'Client'}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Clock className="w-3 h-3" /> {formatTime(session.scheduledAt)} • {session.sessionType}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={session.status === "scheduled" ? "default" : "secondary"}>
                                {session.status}
                              </Badge>
                              <Button size="sm" variant="outline" data-testid={`button-view-${session.id}`}>View Details</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle>Patient Analytics</CardTitle>
                    <CardDescription>Weekly consultation overview</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <img 
                      src={dashboardImg} 
                      alt="Analytics Graph" 
                      className="w-full h-64 object-cover object-top"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-green-600 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" /> Join Client Session
                    </CardTitle>
                    <CardDescription className="text-white/80">Enter session ID to join a chat</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input
                        placeholder="Paste session ID here..."
                        value={sessionIdInput}
                        onChange={(e) => setSessionIdInput(e.target.value)}
                        className="bg-white border-white/30 text-gray-900 placeholder:text-gray-500"
                        data-testid="input-session-id"
                      />
                      <Button 
                        variant="secondary" 
                        className="w-full font-bold"
                        onClick={() => {
                          if (sessionIdInput.trim()) {
                            setLocation(`/professional-chat/${sessionIdInput.trim()}`);
                          }
                        }}
                        disabled={!sessionIdInput.trim()}
                        data-testid="button-join-session"
                      >
                        Join Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" /> Wallet Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {walletLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <div className="text-4xl font-bold mb-2" data-testid="text-wallet-balance">
                          ₹{walletData?.availableBalance || "0"}
                        </div>
                        <p className="text-primary-foreground/80 text-sm mb-6">Available for withdrawal</p>
                        <Button variant="secondary" className="w-full font-bold" data-testid="button-withdraw">
                          Withdraw Funds
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                      {[
                        { title: "Session completed", desc: "with Rahul Verma", time: "2h ago" },
                        { title: "New review received", desc: "5 stars from Priya", time: "4h ago" },
                        { title: "Payment received", desc: "₹800 credited", time: "5h ago" },
                        { title: "Profile updated", desc: "New availability set", time: "1d ago" },
                      ].map((item, i) => (
                        <div key={i} className="relative pl-8" data-testid={`activity-${i}`}>
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary z-10"></div>
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                          <span className="text-[10px] text-muted-foreground mt-1 block">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
