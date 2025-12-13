import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
  FileText
} from "lucide-react";
import { useState } from "react";
import dashboardImg from "@assets/generated_images/professional_therapist_dashboard_with_analytics_and_appointments.png";
import complianceBadge from "@assets/generated_images/secure_medical_data_privacy_compliance_shield_badge.png";

export default function ProfessionalDashboard() {
  const [isOnline, setIsOnline] = useState(true);

  const stats = [
    { label: "Today's Earnings", value: "₹2,450", change: "+12%", icon: Wallet, color: "text-green-600 bg-green-100" },
    { label: "Total Sessions", value: "8", change: "4 pending", icon: Video, color: "text-blue-600 bg-blue-100" },
    { label: "Profile Views", value: "142", change: "+24%", icon: Users, color: "text-purple-600 bg-purple-100" },
    { label: "Avg. Rating", value: "4.9", change: "124 reviews", icon: Star, color: "text-yellow-600 bg-yellow-100" },
  ];

  const upcomingSessions = [
    { id: 1, client: "Rahul Verma", time: "10:00 AM", type: "Video Call", status: "Upcoming", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60" },
    { id: 2, client: "Sneha Gupta", time: "11:30 AM", type: "Chat", status: "Upcoming", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" },
    { id: 3, client: "Amit Patel", time: "02:00 PM", type: "Video Call", status: "Pending", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-background border-r hidden md:flex flex-col fixed h-[calc(100vh-64px)] top-16">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200" />
                <AvatarFallback>DR</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-sm">Dr. Arjun Mehta</h3>
                <p className="text-xs text-muted-foreground">Psychiatrist</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              <Button variant="secondary" className="w-full justify-start gap-3 font-medium">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                <Calendar className="w-4 h-4" /> Appointments
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                <Users className="w-4 h-4" /> My Patients
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                <Wallet className="w-4 h-4" /> Earnings
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                <MessageSquare className="w-4 h-4" /> Messages
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
                <TrendingUp className="w-4 h-4" /> Analytics
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-muted-foreground">
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
              <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isOnline ? "You are visible to clients" : "You are currently offline"}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold font-serif">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, Dr. Mehta. You have 3 upcoming sessions.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button className="rounded-full gap-2 bg-primary">
                  <Clock className="w-4 h-4" /> Schedule Break
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
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
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Upcoming Sessions */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>Your appointments for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <Avatar>
                              <AvatarImage src={session.img} />
                              <AvatarFallback>{session.client.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold">{session.client}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3 h-3" /> {session.time} • {session.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={session.status === "Upcoming" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                            <Button size="sm" variant="outline">View Details</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Patient Analytics Graph Area */}
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

              {/* Right Sidebar - Recent Activity */}
              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" /> Wallet Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold mb-2">₹12,450</div>
                    <p className="text-primary-foreground/80 text-sm mb-6">Available for withdrawal</p>
                    <Button variant="secondary" className="w-full font-bold">
                      Withdraw Funds
                    </Button>
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
                        <div key={i} className="relative pl-8">
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
