import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Loader2, Shield, Users, Calendar, BookOpen, MessageSquare, AlertTriangle, Flower2, Smile, IndianRupee, Percent, RotateCcw, Landmark } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Link } from "wouter";

interface PaymentAnalytics {
  totalRevenue: string;
  totalCommission: string;
  totalTax: string;
  totalRefunded: string;
  instantSessionAcceptanceRate: number | null;
  instantSessionsTotal: number;
  instantSessionsAccepted: number;
}

interface AnalyticsOverview {
  totalUsers: number;
  totalClients: number;
  totalProfessionals: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSessions: number;
  completedSessions: number;
  totalJournalEntries: number;
  totalChatMessages: number;
  totalCrisisEvents: number;
  openCrisisEvents: number;
  totalMicroPractices: number;
  totalCheckIns: number;
  signupsByDay: Array<{ date: string; count: number }>;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold">
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const [response, paymentResponse] = await Promise.all([
        fetch("/api/admin/analytics", { credentials: "include" }),
        fetch("/api/admin/payments/analytics", { credentials: "include" }),
      ]);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setLocation("/admin/login");
          throw new Error("Please log in to access admin features");
        }
        throw new Error("Failed to fetch analytics");
      }
      setData(await response.json());
      if (paymentResponse.ok) setPaymentData(await paymentResponse.json());
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load analytics", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
        toast({
          title: "Access Denied",
          description: "This is an admin-only area. Redirecting to admin login...",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/admin/login"), 1500);
        return;
      }
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, user]);

  if (isAuthLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Redirecting to admin login...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">Analytics</h1>
            <p className="text-muted-foreground">Basic usage overview — signups and engagement, at a glance.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/payments">
              <Button variant="outline">
                <IndianRupee className="w-4 h-4 mr-2" /> Payments & Refunds
              </Button>
            </Link>
            <Button variant="outline" onClick={fetchAnalytics} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="space-y-8">
            {paymentData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<IndianRupee className="w-5 h-5" />} label="Total Revenue" value={`₹${paymentData.totalRevenue}`}
                  sub={`₹${paymentData.totalCommission} commission`} />
                <StatCard icon={<Landmark className="w-5 h-5" />} label="Tax Collected" value={`₹${paymentData.totalTax}`} />
                <StatCard icon={<RotateCcw className="w-5 h-5" />} label="Total Refunded" value={`₹${paymentData.totalRefunded}`} />
                <StatCard icon={<Percent className="w-5 h-5" />} label="Instant Accept Rate"
                  value={paymentData.instantSessionAcceptanceRate !== null ? `${paymentData.instantSessionAcceptanceRate}%` : "—"}
                  sub={`${paymentData.instantSessionsAccepted} / ${paymentData.instantSessionsTotal} accepted`} />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={data.totalUsers}
                sub={`${data.totalClients} clients • ${data.totalProfessionals} professionals`} />
              <StatCard icon={<Users className="w-5 h-5" />} label="New (7 days)" value={data.newUsersLast7Days}
                sub={`${data.newUsersLast30Days} in last 30 days`} />
              <StatCard icon={<Calendar className="w-5 h-5" />} label="Sessions" value={data.totalSessions}
                sub={`${data.completedSessions} completed`} />
              <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Crisis Alerts" value={data.totalCrisisEvents}
                sub={`${data.openCrisisEvents} still open`} />
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Journal Entries" value={data.totalJournalEntries} />
              <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Chat Messages" value={data.totalChatMessages} />
              <StatCard icon={<Flower2 className="w-5 h-5" />} label="Micro-Practices" value={data.totalMicroPractices} />
              <StatCard icon={<Smile className="w-5 h-5" />} label="Daily Check-ins" value={data.totalCheckIns} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Signups — Last 30 Days</CardTitle>
                <CardDescription>New user registrations by day</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data.signupsByDay.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                    <Users className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No signups in the last 30 days yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.signupsByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        labelFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      />
                      <Bar dataKey="count" fill="#FF9933" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
