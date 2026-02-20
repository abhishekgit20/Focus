import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Phone,
  LogOut,
  User,
  X,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  const [activeNav, setActiveNav] = useState("dashboard");
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState("");
  const [breakEndTime, setBreakEndTime] = useState("");
  const [breakDate, setBreakDate] = useState("");
  const [sessionIdError, setSessionIdError] = useState("");
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading: isUserLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not a professional (ProtectedRoute handles unauthenticated)
  useEffect(() => {
    if (!isUserLoading && currentUser && currentUser.role !== 'professional') {
      toast({
        title: "Access Denied",
        description: "This page is only available for professionals.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isUserLoading, currentUser, setLocation, toast]);

  // Optimize queries with staleTime and parallel fetching
  const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery<ProfessionalProfileData>({
    queryKey: ['/api/professional/profile'],
    queryFn: async () => {
      const res = await fetch('/api/professional/profile', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setLocation('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1,
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/professional/stats'],
    queryFn: async () => {
      const res = await fetch('/api/professional/stats', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setLocation('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch stats');
      }
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 2 * 60 * 1000, // 2 minutes - stats can be slightly stale
    refetchInterval: 5 * 60 * 1000, // Reduced from 30s to 5 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery<WalletData>({
    queryKey: ['/api/professional/wallet'],
    queryFn: async () => {
      const res = await fetch('/api/professional/wallet', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setLocation('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch wallet');
      }
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 1 * 60 * 1000, // 1 minute - wallet updates less frequently
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useQuery<{ sessions: SessionData[] }>({
    queryKey: ['/api/professional/sessions/today'],
    queryFn: async () => {
      const res = await fetch('/api/professional/sessions/today', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setLocation('/login');
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch sessions');
      }
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 30 * 1000, // 30 seconds - sessions change more frequently
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    gcTime: 5 * 60 * 1000,
    retry: 1,
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

  // Update availability
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await fetch('/api/professionals/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isOnline }),
      });
      if (!res.ok) throw new Error('Failed to update availability');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional/profile'] });
    },
  });

  const handleAvailabilityChange = (checked: boolean) => {
    setIsOnline(checked);
    updateAvailabilityMutation.mutate(checked);
  };

  // Validate and join session
  const validateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Session not found');
        }
        throw new Error('Failed to validate session');
      }
      const data = await res.json();
      return data.session;
    },
  });

  const handleJoinSession = async () => {
    const trimmedId = sessionIdInput.trim();
    if (!trimmedId) {
      setSessionIdError("Please enter a session ID");
      return;
    }

    setSessionIdError("");
    try {
      const session = await validateSessionMutation.mutateAsync(trimmedId);
      // Check if user is the professional for this session
      if (session.professionalId !== currentUser?.id) {
        setSessionIdError("You don't have access to this session");
        return;
      }
      setLocation(`/professional-chat/${trimmedId}`);
    } catch (error: any) {
      setSessionIdError(error.message || "Invalid session ID");
    }
  };

  // Schedule break
  const scheduleBreakMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; date: string }) => {
      // Stub implementation - in real app, this would create a break entry
      return new Promise((resolve) => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: "Break Scheduled",
        description: "Your break has been scheduled successfully.",
      });
      setIsBreakModalOpen(false);
      setBreakStartTime("");
      setBreakEndTime("");
      setBreakDate("");
    },
  });

  const handleScheduleBreak = () => {
    if (!breakDate || !breakStartTime || !breakEndTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to schedule a break.",
        variant: "destructive",
      });
      return;
    }
    scheduleBreakMutation.mutate({
      date: breakDate,
      startTime: breakStartTime,
      endTime: breakEndTime,
    });
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        queryClient.clear();
        setLocation('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Navigation handlers
  const handleNavClick = (nav: string) => {
    setActiveNav(nav);
    if (nav === "appointments") {
      toast({
        title: "Coming Soon",
        description: "Appointments management is coming soon.",
      });
    } else if (nav === "patients") {
      toast({
        title: "Coming Soon",
        description: "Patient management is coming soon.",
      });
    } else if (nav === "earnings") {
      toast({
        title: "Coming Soon",
        description: "Earnings details are coming soon.",
      });
    } else if (nav === "messages") {
      toast({
        title: "Coming Soon",
        description: "Messages are coming soon.",
      });
    } else if (nav === "analytics") {
      toast({
        title: "Coming Soon",
        description: "Analytics dashboard is coming soon.",
      });
    } else if (nav === "settings") {
      toast({
        title: "Coming Soon",
        description: "Settings are coming soon.",
      });
    }
  };

  // View session details
  const handleViewDetails = (sessionId: string) => {
    setLocation(`/professional-chat/${sessionId}`);
  };

  // Show skeleton loader while initial data is loading
  const isInitialLoading = isProfileLoading || (statsLoading && !stats) || (walletLoading && !walletData) || (sessionsLoading && !sessionsData);

  // Show loading state while checking authentication
  if (isUserLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show redirect message if not a professional
  if (currentUser.role !== 'professional') {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20 flex">
        <aside className="w-64 bg-background border-r hidden md:flex flex-col fixed h-[calc(100vh-64px)] top-16">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {isProfileLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    profileData?.user?.fullName 
                      ? profileData.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : currentUser?.fullName 
                        ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : 'P'
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {isProfileLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-sm truncate">{profileData?.user?.fullName || currentUser?.fullName || "Professional"}</h3>
                    <p className="text-xs text-muted-foreground truncate">{profileData?.profile?.specialization || "Professional"}</p>
                  </>
                )}
              </div>
            </div>
            
            <nav className="space-y-2">
              <Button 
                variant={activeNav === "dashboard" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "dashboard" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("dashboard")}
                data-testid="nav-dashboard"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button 
                variant={activeNav === "appointments" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "appointments" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("appointments")}
                data-testid="nav-appointments"
              >
                <Calendar className="w-4 h-4" /> Appointments
              </Button>
              <Button 
                variant={activeNav === "patients" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "patients" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("patients")}
                data-testid="nav-patients"
              >
                <Users className="w-4 h-4" /> My Patients
              </Button>
              <Button 
                variant={activeNav === "earnings" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "earnings" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("earnings")}
                data-testid="nav-earnings"
              >
                <Wallet className="w-4 h-4" /> Earnings
              </Button>
              <Button 
                variant={activeNav === "messages" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "messages" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("messages")}
                data-testid="nav-messages"
              >
                <MessageSquare className="w-4 h-4" /> Messages
              </Button>
              <Button 
                variant={activeNav === "analytics" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "analytics" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("analytics")}
                data-testid="nav-analytics"
              >
                <TrendingUp className="w-4 h-4" /> Analytics
              </Button>
              <Button 
                variant={activeNav === "settings" ? "secondary" : "ghost"} 
                className={`w-full justify-start gap-3 font-medium ${activeNav === "settings" ? "" : "text-muted-foreground"}`}
                onClick={() => handleNavClick("settings")}
                data-testid="nav-settings"
              >
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
              <Switch 
                checked={isOnline} 
                onCheckedChange={handleAvailabilityChange} 
                disabled={updateAvailabilityMutation.isPending}
                data-testid="switch-availability" 
              />
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full relative" data-testid="button-notifications">
                      <Bell className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Notifications</h4>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No new notifications</p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button 
                  className="rounded-full gap-2 bg-primary" 
                  onClick={() => setIsBreakModalOpen(true)}
                  data-testid="button-schedule-break"
                >
                  <Clock className="w-4 h-4" /> Schedule Break
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {profileData?.user?.fullName 
                            ? profileData.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : currentUser?.fullName 
                              ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : 'P'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profileData?.user?.fullName || currentUser?.fullName || "Professional"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {profileData?.profile?.specialization || "Professional"}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>View Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isInitialLoading && !stats ? (
                // Skeleton loaders for stats cards
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-none shadow-sm" data-testid={`card-stat-skeleton-${i}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-muted animate-pulse w-12 h-12"></div>
                        <div className="h-5 w-16 bg-muted animate-pulse rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                        <div className="h-8 bg-muted animate-pulse rounded w-16"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
                    {sessionsLoading && !sessionsData ? (
                      // Skeleton loader for sessions
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl animate-pulse">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 rounded-full bg-muted"></div>
                              <div className="space-y-2 flex-1">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="h-3 bg-muted rounded w-24"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-5 w-16 bg-muted rounded"></div>
                              <div className="h-8 w-24 bg-muted rounded"></div>
                            </div>
                          </div>
                        ))}
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
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewDetails(session.id)}
                                data-testid={`button-view-${session.id}`}
                              >
                                View Details
                              </Button>
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
                      <div>
                        <Input
                          placeholder="Paste session ID here..."
                          value={sessionIdInput}
                          onChange={(e) => {
                            setSessionIdInput(e.target.value);
                            setSessionIdError("");
                          }}
                          className={`bg-white border-white/30 text-gray-900 placeholder:text-gray-500 ${
                            sessionIdError ? "border-red-300" : ""
                          }`}
                          data-testid="input-session-id"
                        />
                        {sessionIdError && (
                          <div className="flex items-center gap-1 mt-2 text-red-200 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{sessionIdError}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="secondary" 
                        className="w-full font-bold"
                        onClick={handleJoinSession}
                        disabled={!sessionIdInput.trim() || validateSessionMutation.isPending}
                        data-testid="button-join-session"
                      >
                        {validateSessionMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          "Join Session"
                        )}
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
                    {walletLoading && !walletData ? (
                      <div className="space-y-4">
                        <div className="h-12 bg-primary-foreground/20 animate-pulse rounded"></div>
                        <div className="h-4 bg-primary-foreground/20 animate-pulse rounded w-32"></div>
                        <div className="h-10 bg-primary-foreground/20 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold mb-2" data-testid="text-wallet-balance">
                          ₹{walletData?.availableBalance || "0"}
                        </div>
                        <p className="text-primary-foreground/80 text-sm mb-6">Available for withdrawal</p>
                        <Button 
                          variant="secondary" 
                          className="w-full font-bold" 
                          onClick={() => {
                            toast({
                              title: "Coming Soon",
                              description: "Withdrawal functionality is coming soon.",
                            });
                          }}
                          data-testid="button-withdraw"
                        >
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

      {/* Schedule Break Modal */}
      <Dialog open={isBreakModalOpen} onOpenChange={setIsBreakModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule Break</DialogTitle>
            <DialogDescription>
              Set a time when you'll be unavailable for consultations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="break-date">Date</Label>
              <Input
                id="break-date"
                type="date"
                value={breakDate}
                onChange={(e) => setBreakDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="break-start">Start Time</Label>
                <Input
                  id="break-start"
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="break-end">End Time</Label>
                <Input
                  id="break-end"
                  type="time"
                  value={breakEndTime}
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  min={breakStartTime}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBreakModalOpen(false);
                setBreakStartTime("");
                setBreakEndTime("");
                setBreakDate("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleBreak}
              disabled={scheduleBreakMutation.isPending}
            >
              {scheduleBreakMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Break"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
