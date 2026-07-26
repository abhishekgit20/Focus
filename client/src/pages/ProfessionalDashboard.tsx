import { PageTransition } from "@/components/PageTransition";
import { NotificationBell } from "@/components/NotificationBell";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { onInboxEvent } from "@/lib/realtimeEvents";
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
  LogOut,
  User,
  X,
  IndianRupee,
  Plus,
  Trash2,
  Menu,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AccountSecuritySettings } from "@/components/AccountSecuritySettings";
import { SessionSettingsPanel } from "@/components/SessionSettingsPanel";
import { formatDistanceToNow } from "date-fns";
import dashboardImg from "@assets/generated_images/professional_therapist_dashboard_with_analytics_and_appointments.png";
import complianceBadge from "@assets/generated_images/secure_medical_data_privacy_compliance_shield_badge.png";

interface DashboardStats {
  todayEarnings: string;
  totalSessions: number;
  upcomingSessions: number;
  pendingSessions: number;
  avgRating: string | null;
  totalReviews: number;
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
  type: string;
  status: string;
  client?: {
    fullName: string;
    profileImage?: string;
  };
}

interface FullSession {
  id: string;
  clientId: string;
  scheduledAt: string;
  type: string;
  status: string;
  totalCost?: string | null;
  client?: {
    fullName?: string;
    profileImage?: string;
    email?: string;
  };
}

interface EarningsRecord {
  id: string;
  sessionId: string;
  amount: string;
  status: string;
  createdAt: string;
}

interface ActivityItem {
  title: string;
  desc: string;
  timestamp: string;
}

interface ProfessionalProfileData {
  profile: {
    specialization: string;
    qualification?: string;
    experience?: number;
    bio?: string;
    languages?: string[];
    pricePerMinute?: string;
    isOnline?: boolean;
  };
  user: {
    id: string;
    fullName: string;
    profileImage?: string;
  };
}

interface IncomingRequest {
  session: { id: string; type: string; scheduledAt: string };
  client: { id: string; fullName?: string; profileImage?: string };
}

const VALID_TABS = ["dashboard", "appointments", "patients", "earnings", "messages", "analytics", "session-settings", "settings"] as const;
type DashboardTab = typeof VALID_TABS[number];

const TAB_TITLES: Record<DashboardTab, string> = {
  dashboard: "Dashboard",
  appointments: "Appointments",
  patients: "My Patients",
  earnings: "Earnings",
  messages: "Messages",
  analytics: "Analytics",
  "session-settings": "Session Settings",
  settings: "Settings",
};

// Shared between the desktop sidebar and the mobile Sheet drawer so the two
// can't drift out of sync the way the rest of this dashboard has no
// mobile-nav fallback at all right now — every nav item, and the online/
// offline switch, previously only existed inside a `hidden md:flex` sidebar.
function SidebarNav({
  profileData,
  isProfileLoading,
  currentUser,
  activeNav,
  onNavClick,
  isOnline,
  onAvailabilityChange,
  isAvailabilityPending,
}: {
  profileData: ProfessionalProfileData | undefined;
  isProfileLoading: boolean;
  currentUser: { fullName?: string | null } | null | undefined;
  activeNav: DashboardTab;
  onNavClick: (nav: DashboardTab) => void;
  isOnline: boolean;
  onAvailabilityChange: (checked: boolean) => void;
  isAvailabilityPending: boolean;
}) {
  const navItems: { tab: DashboardTab; label: string; icon: typeof LayoutDashboard; testId: string }[] = [
    { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { tab: "appointments", label: "Appointments", icon: Calendar, testId: "nav-appointments" },
    { tab: "patients", label: "My Patients", icon: Users, testId: "nav-patients" },
    { tab: "earnings", label: "Earnings", icon: Wallet, testId: "nav-earnings" },
    { tab: "messages", label: "Messages", icon: MessageSquare, testId: "nav-messages" },
    { tab: "analytics", label: "Analytics", icon: TrendingUp, testId: "nav-analytics" },
    { tab: "session-settings", label: "Session Settings", icon: IndianRupee, testId: "nav-session-settings" },
    { tab: "settings", label: "Settings", icon: Settings, testId: "nav-settings" },
  ];

  return (
    <div className="flex flex-col h-full">
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
          {navItems.map(({ tab, label, icon: Icon, testId }) => (
            <Button
              key={tab}
              variant={activeNav === tab ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 font-medium ${activeNav === tab ? "" : "text-muted-foreground"}`}
              onClick={() => onNavClick(tab)}
              data-testid={testId}
            >
              <Icon className="w-4 h-4" /> {label}
            </Button>
          ))}
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
            onCheckedChange={onAvailabilityChange}
            disabled={isAvailabilityPending}
            data-testid="switch-availability"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isOnline ? "You are visible to clients" : "You are currently offline"}
        </p>
      </div>
    </div>
  );
}

export default function ProfessionalDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [, params] = useRoute("/professional-dashboard/:tab?");
  const activeNav: DashboardTab = (VALID_TABS as readonly string[]).includes(params?.tab || "")
    ? (params!.tab as DashboardTab)
    : "dashboard";
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState("");
  const [breakEndTime, setBreakEndTime] = useState("");
  const [breakDate, setBreakDate] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading: isUserLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // REST fallback for pending instant requests: the live WS push below only
  // ever reaches a professional who happens to already be connected at the
  // exact moment a request comes in. Anyone who wasn't (page not open yet,
  // brief reconnect, mobile browser backgrounded) would otherwise never see
  // it — not even after refreshing, since a fresh WS connection only
  // receives *future* broadcasts, not ones sent while it was disconnected.
  const { data: pendingRequestsData } = useQuery<{ sessions: Array<IncomingRequest["session"] & { client: IncomingRequest["client"] }> }>({
    queryKey: ['/api/sessions/pending-requests'],
    queryFn: async () => {
      const res = await fetch('/api/sessions/pending-requests', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending requests');
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // safety net in case a WS push is ever missed
  });

  const allIncomingRequests = useMemo(() => {
    const merged = new Map<string, IncomingRequest>();
    for (const s of pendingRequestsData?.sessions ?? []) {
      merged.set(s.id, { session: s, client: s.client });
    }
    // Live WS-pushed requests take precedence for freshness, and cover the
    // gap before the REST query's first fetch resolves.
    for (const r of incomingRequests) {
      merged.set(r.session.id, r);
    }
    return Array.from(merged.values());
  }, [pendingRequestsData, incomingRequests]);

  // Reacts to the app-wide inbox connection (mounted once in App.tsx —
  // see useUserInboxSocket) instead of opening a second WebSocket to the
  // same room. That hook already invalidates every cached query this event
  // affects app-wide; this subscription only needs the raw payload for
  // page-local UI (the incoming-request card's list + toast) that a cache
  // invalidation alone can't provide.
  useEffect(() => {
    return onInboxEvent((data) => {
      if (data.type === "session_request") {
        const session = data.session as IncomingRequest["session"];
        const client = data.client as IncomingRequest["client"];
        setIncomingRequests(prev => [...prev, { session, client }]);
        toast({
          title: "New Session Request",
          description: `${client?.fullName || "A client"} wants to connect now.`,
        });
      } else if (data.type === "new_scheduled_booking") {
        const session = data.session as { type?: string } | undefined;
        toast({
          title: "New booking",
          description: `A ${session?.type ?? ""} session was just booked.`,
        });
      }
    });
  }, [toast]);

  const respondMutation = useMutation({
    mutationFn: async ({ sessionId, accept }: { sessionId: string; accept: boolean }) => {
      const res = await fetch(`/api/sessions/${sessionId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to respond to request');
      }
      return res.json();
    },
  });

  const handleRespond = async (request: IncomingRequest, accept: boolean) => {
    setRespondingId(request.session.id);
    try {
      await respondMutation.mutateAsync({ sessionId: request.session.id, accept });
      setIncomingRequests(prev => prev.filter(r => r.session.id !== request.session.id));
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/pending-requests'] });
      if (accept) {
        setLocation(`/professional-chat/${request.session.id}`);
      } else {
        toast({ title: "Request Declined" });
      }
    } catch (error: any) {
      toast({
        title: "Couldn't respond",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

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

  // The Availability switch previously never reflected the server's actual
  // isOnline value — it just started hardcoded "on" every page load,
  // regardless of the real state, so toggling it could silently flip you
  // further offline instead of on. Sync from the real value whenever it loads.
  useEffect(() => {
    if (profileData?.profile?.isOnline !== undefined) {
      setIsOnline(profileData.profile.isOnline);
    }
  }, [profileData?.profile?.isOnline]);

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

  // Full session history, used by the Appointments and My Patients tabs
  const { data: allSessionsData, isLoading: allSessionsLoading } = useQuery<{ sessions: FullSession[] }>({
    queryKey: ['/api/professional/sessions'],
    queryFn: async () => {
      const res = await fetch('/api/professional/sessions', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional' && (activeNav === 'appointments' || activeNav === 'patients'),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Earnings history, used by the Earnings tab
  const { data: earningsData, isLoading: earningsLoading } = useQuery<{ earnings: EarningsRecord[] }>({
    queryKey: ['/api/earnings'],
    queryFn: async () => {
      const res = await fetch('/api/earnings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch earnings');
      return res.json();
    },
    enabled: !!currentUser && currentUser.role === 'professional' && activeNav === 'earnings',
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/professional/recent-activity', currentUser?.id],
    queryFn: async () => {
      const [sessionsRes, earningsRes, reviewsRes] = await Promise.all([
        fetch('/api/sessions', { credentials: 'include' }),
        fetch('/api/earnings', { credentials: 'include' }),
        fetch(`/api/reviews/${currentUser?.id}`, { credentials: 'include' }),
      ]);

      const items: ActivityItem[] = [];

      if (sessionsRes.ok) {
        const { sessions } = await sessionsRes.json();
        for (const s of sessions || []) {
          if (s.status === 'completed' && (s.endTime || s.scheduledAt)) {
            items.push({
              title: "Session completed",
              desc: `${s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Consultation'} session`,
              timestamp: s.endTime || s.scheduledAt,
            });
          }
        }
      }

      if (earningsRes.ok) {
        const { earnings } = await earningsRes.json();
        for (const e of earnings || []) {
          items.push({
            title: "Payment recorded",
            desc: `₹${e.amount} ${e.status === 'paid' ? 'paid out' : 'pending payout'}`,
            timestamp: e.createdAt,
          });
        }
      }

      if (reviewsRes.ok) {
        const { reviews } = await reviewsRes.json();
        for (const r of reviews || []) {
          items.push({
            title: "New review received",
            desc: `${r.rating} star${r.rating === 1 ? '' : 's'}${r.comment ? ' with feedback' : ''}`,
            timestamp: r.createdAt,
          });
        }
      }

      return items
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    },
    enabled: !!currentUser && currentUser.role === 'professional',
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const displayStats: Array<{ label: string; value: string; change?: string; icon: typeof Wallet; color: string }> = [
    {
      label: "Today's Earnings",
      value: stats ? `₹${stats.todayEarnings}` : "₹0",
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
      label: "Upcoming Sessions",
      value: stats?.upcomingSessions?.toString() || "0",
      change: "Scheduled",
      icon: Calendar,
      color: "text-purple-600 bg-purple-100"
    },
    {
      label: "Avg. Rating",
      value: stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "New",
      change: `${stats?.totalReviews || 0} reviews`,
      icon: Star,
      color: "text-yellow-600 bg-yellow-100"
    },
  ];

  const upcomingSessions = sessionsData?.sessions || [];
  const allSessions = allSessionsData?.sessions || [];
  const earningsList = earningsData?.earnings || [];

  interface PatientSummary {
    clientId: string;
    fullName: string;
    profileImage?: string;
    sessionCount: number;
    lastSessionAt: string;
  }

  const patients: PatientSummary[] = Object.values(
    allSessions.reduce<Record<string, PatientSummary>>((acc, s) => {
      const existing = acc[s.clientId];
      if (!existing) {
        acc[s.clientId] = {
          clientId: s.clientId,
          fullName: s.client?.fullName || "Client",
          profileImage: s.client?.profileImage,
          sessionCount: 1,
          lastSessionAt: s.scheduledAt,
        };
      } else {
        existing.sessionCount += 1;
        if (new Date(s.scheduledAt) > new Date(existing.lastSessionAt)) {
          existing.lastSessionAt = s.scheduledAt;
        }
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.lastSessionAt).getTime() - new Date(a.lastSessionAt).getTime());

  // Settings form — seeded once from the loaded profile, then locally editable
  const [settingsForm, setSettingsForm] = useState({
    specialization: "",
    qualification: "",
    experience: "",
    bio: "",
    languages: "",
  });
  const [settingsSeeded, setSettingsSeeded] = useState(false);

  useEffect(() => {
    if (profileData?.profile && !settingsSeeded) {
      setSettingsForm({
        specialization: profileData.profile.specialization || "",
        qualification: profileData.profile.qualification || "",
        experience: profileData.profile.experience?.toString() || "",
        bio: profileData.profile.bio || "",
        languages: (profileData.profile.languages || []).join(", "),
      });
      setSettingsSeeded(true);
    }
  }, [profileData, settingsSeeded]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/professional/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          specialization: settingsForm.specialization,
          qualification: settingsForm.qualification,
          experience: Number(settingsForm.experience) || 0,
          bio: settingsForm.bio,
          languages: settingsForm.languages.split(',').map(l => l.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professional/profile'] });
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't save settings",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

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

  // Each item is a real route, not just a highlighted state.
  const handleNavClick = (nav: DashboardTab) => {
    setLocation(nav === "dashboard" ? "/professional-dashboard" : `/professional-dashboard/${nav}`);
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
      <div className="min-h-screen bg-muted/20">
        <div className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-nav" aria-label="Open navigation menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarNav
                  profileData={profileData}
                  isProfileLoading={isProfileLoading}
                  currentUser={currentUser}
                  activeNav={activeNav}
                  onNavClick={(nav) => { handleNavClick(nav); setIsMobileNavOpen(false); }}
                  isOnline={isOnline}
                  onAvailabilityChange={handleAvailabilityChange}
                  isAvailabilityPending={updateAvailabilityMutation.isPending}
                />
              </SheetContent>
            </Sheet>
            <Link href="/" className="text-2xl font-serif font-bold text-primary hover:opacity-90 transition-opacity">
              Focus
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
        <div className="flex">
        <aside className="w-64 bg-background border-r hidden md:flex flex-col fixed h-[calc(100vh-64px)] top-16">
          <SidebarNav
            profileData={profileData}
            isProfileLoading={isProfileLoading}
            currentUser={currentUser}
            activeNav={activeNav}
            onNavClick={handleNavClick}
            isOnline={isOnline}
            onAvailabilityChange={handleAvailabilityChange}
            isAvailabilityPending={updateAvailabilityMutation.isPending}
          />
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif" data-testid="text-dashboard-title">{TAB_TITLES[activeNav]}</h1>
                <p className="text-muted-foreground" data-testid="text-welcome-message">
                  {activeNav === "dashboard"
                    ? `Welcome back, ${profileData?.user?.fullName?.split(' ')[0] || currentUser?.fullName?.split(' ')[0] || "Professional"}. You have ${stats?.upcomingSessions || 0} upcoming sessions.`
                    : activeNav === "appointments"
                    ? "Every session you've had or have booked, in one place."
                    : activeNav === "patients"
                    ? "Clients who have booked a session with you."
                    : activeNav === "earnings"
                    ? "Your payout history and pending earnings."
                    : activeNav === "settings"
                    ? "Keep your public profile accurate and up to date."
                    : "This isn't built yet — here's what to expect."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Button
                  className="rounded-full gap-2 bg-primary" 
                  onClick={() => setIsBreakModalOpen(true)}
                  data-testid="button-schedule-break"
                >
                  <Clock className="w-4 h-4" /> Schedule Break
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
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

            {activeNav === "dashboard" && (
            <>
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
                        {stat.change && (
                          <Badge variant="outline" className="font-normal">
                            {stat.change}
                          </Badge>
                        )}
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
                                  <Clock className="w-3 h-3" /> {formatTime(session.scheduledAt)} • {session.type}
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
                      <Bell className="w-5 h-5" /> Incoming Requests
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Clients requesting to connect now show up here instantly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allIncomingRequests.length === 0 ? (
                      <p className="text-sm text-white/70 py-2" data-testid="text-no-requests">
                        No requests right now. We'll notify you the instant a client wants to connect.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {allIncomingRequests.map((req) => (
                          <div key={req.session.id} className="bg-white/10 rounded-lg p-3" data-testid={`request-${req.session.id}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-white/20 text-white font-bold">
                                  {req.client.fullName
                                    ? req.client.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                    : 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm">{req.client.fullName || 'Client'}</p>
                                <p className="text-xs text-white/70 capitalize">{req.session.type} session</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1 font-bold"
                                onClick={() => handleRespond(req, true)}
                                disabled={respondingId === req.session.id}
                                data-testid={`button-accept-${req.session.id}`}
                              >
                                {respondingId === req.session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 bg-transparent border-white/40 text-white hover:bg-white/10"
                                onClick={() => handleRespond(req, false)}
                                disabled={respondingId === req.session.id}
                                data-testid={`button-decline-${req.session.id}`}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                        <p className="text-primary-foreground/80 text-sm mb-6">Earned from completed sessions</p>
                        {/* No self-service payout endpoint exists yet — this used to say
                            "Coming Soon" with no path forward, which reads as broken next to a
                            real, growing balance. Honest interim copy until payouts ship. */}
                        <Button
                          variant="secondary"
                          className="w-full font-bold"
                          onClick={() => {
                            toast({
                              title: "Payouts are processed manually for now",
                              description: "Email support@focus.example.com with your account details and we'll transfer your balance within 2-3 business days.",
                              duration: 8000,
                            });
                          }}
                          data-testid="button-withdraw"
                        >
                          Request Withdrawal
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
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !recentActivity || recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No activity yet — completed sessions, reviews, and payments will show up here.
                      </p>
                    ) : (
                      <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                        {recentActivity.map((item, i) => (
                          <div key={i} className="relative pl-8" data-testid={`activity-${i}`}>
                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary z-10"></div>
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            </>
            )}

            {activeNav === "appointments" && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>All Appointments</CardTitle>
                  <CardDescription>{allSessions.length} session{allSessions.length === 1 ? "" : "s"} total</CardDescription>
                </CardHeader>
                <CardContent>
                  {allSessionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : allSessions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No appointments yet</p>
                      <p className="text-sm mt-1">Sessions you book or accept will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl" data-testid={`appointment-${session.id}`}>
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {session.client?.fullName
                                  ? session.client.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                  : 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold">{session.client?.fullName || 'Client'}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3 h-3" /> {new Date(session.scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} • {session.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={session.status === "completed" ? "secondary" : session.status === "cancelled" ? "outline" : "default"} className="capitalize">
                              {session.status}
                            </Badge>
                            {session.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(session.id)}
                                data-testid={`button-view-appointment-${session.id}`}
                              >
                                {session.status === "completed" ? "View" : "Open Chat"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeNav === "patients" && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>My Patients</CardTitle>
                  <CardDescription>{patients.length} client{patients.length === 1 ? "" : "s"} have booked with you</CardDescription>
                </CardHeader>
                <CardContent>
                  {allSessionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No patients yet</p>
                      <p className="text-sm mt-1">Clients you've had a session with will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patients.map((patient) => (
                        <div key={patient.clientId} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl" data-testid={`patient-${patient.clientId}`}>
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {patient.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold">{patient.fullName}</h4>
                              <p className="text-sm text-muted-foreground">
                                Last session {formatDistanceToNow(new Date(patient.lastSessionAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{patient.sessionCount} session{patient.sessionCount === 1 ? "" : "s"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeNav === "earnings" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                    <CardContent className="p-6">
                      <p className="text-sm text-primary-foreground/80 mb-1">Available for withdrawal</p>
                      <p className="text-3xl font-bold" data-testid="text-earnings-available">₹{walletData?.availableBalance || "0"}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Pending payout</p>
                      <p className="text-3xl font-bold" data-testid="text-earnings-pending">₹{walletData?.pendingEarnings || "0"}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>Earnings recorded from your completed sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {earningsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : earningsList.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No earnings recorded yet</p>
                        <p className="text-sm mt-1">Completed sessions will show up here as earnings.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {earningsList.map((e) => (
                          <div key={e.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl" data-testid={`earning-${e.id}`}>
                            <div>
                              <p className="font-bold">₹{e.amount}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(e.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' } as any)}
                              </p>
                            </div>
                            <Badge variant={e.status === "paid" ? "secondary" : "outline"} className="capitalize">
                              {e.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeNav === "settings" && (
              <>
              <Card className="border-none shadow-sm max-w-2xl">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>This is what clients see when browsing professionals</CardDescription>
                </CardHeader>
                <CardContent>
                  {isProfileLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        updateProfileMutation.mutate();
                      }}
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="settings-specialization">Specialization</Label>
                          <Input
                            id="settings-specialization"
                            value={settingsForm.specialization}
                            onChange={(e) => setSettingsForm(f => ({ ...f, specialization: e.target.value }))}
                            data-testid="input-settings-specialization"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="settings-qualification">Qualification</Label>
                          <Input
                            id="settings-qualification"
                            value={settingsForm.qualification}
                            onChange={(e) => setSettingsForm(f => ({ ...f, qualification: e.target.value }))}
                            data-testid="input-settings-qualification"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="settings-experience">Years of experience</Label>
                          <Input
                            id="settings-experience"
                            type="number"
                            min={0}
                            value={settingsForm.experience}
                            onChange={(e) => setSettingsForm(f => ({ ...f, experience: e.target.value }))}
                            data-testid="input-settings-experience"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settings-languages">Languages (comma separated)</Label>
                        <Input
                          id="settings-languages"
                          value={settingsForm.languages}
                          onChange={(e) => setSettingsForm(f => ({ ...f, languages: e.target.value }))}
                          placeholder="English, Hindi"
                          data-testid="input-settings-languages"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settings-bio">Bio</Label>
                        <textarea
                          id="settings-bio"
                          className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                          value={settingsForm.bio}
                          onChange={(e) => setSettingsForm(f => ({ ...f, bio: e.target.value }))}
                          data-testid="input-settings-bio"
                        />
                      </div>
                      <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-settings">
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                          </>
                        ) : "Save Changes"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm max-w-2xl mt-6 bg-primary/5 border border-primary/10">
                <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">Pricing has moved</p>
                    <p className="text-xs text-muted-foreground">Set your prices per session type and duration, plus your working hours, in Session Settings.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleNavClick("session-settings")}>
                    Go to Session Settings
                  </Button>
                </CardContent>
              </Card>

              <div className="max-w-2xl mt-6">
                <AccountSecuritySettings mfaEnabled={!!(currentUser as any)?.mfaEnabled} />
              </div>
              </>
            )}

            {activeNav === "session-settings" && <SessionSettingsPanel />}

            {(activeNav === "messages" || activeNav === "analytics") && (
              <Card className="border-none shadow-sm">
                <CardContent className="py-16 text-center text-muted-foreground">
                  {activeNav === "messages" ? (
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  ) : (
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  )}
                  <p className="font-medium text-foreground">
                    {activeNav === "messages" ? "Messages aren't available yet" : "Analytics aren't available yet"}
                  </p>
                  <p className="text-sm mt-1 max-w-sm mx-auto">
                    {activeNav === "messages"
                      ? "Persistent chat history outside of live sessions is on the roadmap — it needs its own storage, not a shortcut."
                      : "Trend and usage analytics need historical tracking we don't collect yet — we'd rather build it right than fake it."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        </div>
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
