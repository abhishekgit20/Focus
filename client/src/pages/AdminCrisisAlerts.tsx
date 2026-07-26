import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Loader2, Shield, Eye } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";

interface CrisisEvent {
  id: string;
  userId: string | null;
  source: "chat" | "public_chat" | "journal";
  conversationId: string | null;
  severity: string;
  matchedSignals: string[];
  excerpt: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  chat: "Logged-in Chat",
  public_chat: "Public Chat Widget",
  journal: "Journal Entry",
};

const PAGE_SIZE = 50;

export default function AdminCrisisAlerts() {
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

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
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, user]);

  // Previously fetched every crisis event ever recorded with no limit —
  // for a safety-triage queue specifically, an unbounded, ever-growing
  // backlog makes "what still needs review" progressively harder to use,
  // not just slower.
  const fetchEvents = async (offset = 0) => {
    try {
      if (offset === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await fetch(`/api/admin/crisis-events?limit=${PAGE_SIZE}&offset=${offset}`, { credentials: "include" });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setLocation("/admin/login");
          throw new Error("Please log in to access admin features");
        }
        throw new Error("Failed to fetch crisis alerts");
      }

      const data = await response.json();
      setEvents((prev) => (offset === 0 ? data.events || [] : [...prev, ...(data.events || [])]));
      setHasMore(!!data.hasMore);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load crisis alerts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const updateStatus = async (id: string, status: "reviewed" | "resolved") => {
    try {
      setUpdatingId(id);
      const response = await fetch(`/api/admin/crisis-events/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      const data = await response.json();
      toast({ title: "Updated", description: `Marked as ${status}` });
      setEvents((prev) => prev.map((e) => (e.id === id ? data.event : e)));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update crisis alert",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const openEvents = events.filter((e) => e.status === "open");
  const reviewedEvents = events.filter((e) => e.status === "reviewed");
  const resolvedEvents = events.filter((e) => e.status === "resolved");

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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                Crisis Alerts
              </h1>
              <p className="text-muted-foreground">
                Server-detected crisis/self-harm signals from chat and journal entries. Follow up on open alerts promptly.
              </p>
            </div>
            <Button variant="outline" onClick={() => fetchEvents()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className={`transition-shadow hover:shadow-md ${openEvents.length > 0 ? "border-red-500" : ""}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open (needs review)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600"><AnimatedNumber value={openEvents.length} /></div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600"><AnimatedNumber value={reviewedEvents.length} /></div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600"><AnimatedNumber value={resolvedEvents.length} /></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading crisis alerts...</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No crisis alerts recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className={event.status === "open" ? "border-red-500 hover:shadow-lg transition-shadow" : "hover:shadow-lg transition-shadow"}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <CardTitle className="text-lg">{SOURCE_LABEL[event.source] || event.source}</CardTitle>
                        {event.status === "open" && (
                          <Badge className="bg-red-600 hover:bg-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Open
                          </Badge>
                        )}
                        {event.status === "reviewed" && (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600">
                            <Eye className="w-3 h-3 mr-1" /> Reviewed
                          </Badge>
                        )}
                        {event.status === "resolved" && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {formatDate(event.createdAt)}
                        {event.userId && <span>• User: {event.userId}</span>}
                        {!event.userId && <span>• Anonymous (public chat)</span>}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Flagged excerpt:</p>
                    <p className="text-muted-foreground italic">"{event.excerpt}"</p>
                  </div>

                  {event.matchedSignals.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Matched signals:</p>
                      <div className="flex flex-wrap gap-2">
                        {event.matchedSignals.map((signal, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.status !== "resolved" && (
                    <div className="flex gap-3 pt-4 border-t">
                      {event.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingId === event.id}
                          onClick={() => updateStatus(event.id, "reviewed")}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Mark Reviewed
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        disabled={updatingId === event.id}
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatus(event.id, "resolved")}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Resolved
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center pt-6">
            <Button variant="outline" onClick={() => fetchEvents(events.length)} disabled={isLoadingMore}>
              {isLoadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Load More
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
