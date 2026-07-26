import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, Clock, Star, Trash2, RefreshCw, Loader2, Shield } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Feedback {
  id: string;
  name: string | null;
  role: string | null;
  rating: number;
  feedbackText: string;
  featuresUsed: string[];
  showOnHomepage: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const PAGE_SIZE = 50;

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

  // Check if user is admin
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
        toast({
          title: "Access Denied",
          description: "This is an admin-only area. Redirecting to admin login...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/admin/login");
        }, 1500);
      }
    }
  }, [isAuthLoading, isAuthenticated, user, setLocation, toast]);

  // Previously fetched every feedback row ever submitted with no limit at
  // all — this now pages, so a growing table doesn't mean an ever-slower
  // query and an ever-larger DOM on every load.
  const fetchFeedback = async (offset = 0) => {
    try {
      if (offset === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await fetch(`/api/admin/feedback?limit=${PAGE_SIZE}&offset=${offset}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Redirect to admin login if not authenticated or not admin
          setLocation("/admin/login");
          throw new Error("Please log in to access admin features");
        }
        throw new Error("Failed to fetch feedback");
      }

      const data = await response.json();
      setFeedback((prev) => (offset === 0 ? data.feedback || [] : [...prev, ...(data.feedback || [])]));
      setHasMore(!!data.hasMore);
    } catch (error: any) {
      console.error("Fetch feedback error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Check if user is admin before fetching
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
        toast({
          title: "Access Denied",
          description: "This is an admin-only area. Redirecting to admin login...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/admin/login");
        }, 1500);
        return;
      }
      // Only fetch if user is authenticated and is admin
      fetchFeedback();
    }
  }, [isAuthLoading, isAuthenticated, user]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      setUpdatingId(id);
      const response = await fetch(`/api/admin/feedback/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: `Feedback ${status} successfully`,
      });

      // Update local state
      setFeedback((prev) =>
        prev.map((item) => (item.id === id ? data.feedback : item))
      );
    } catch (error: any) {
      console.error("Update status error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback status",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingFeedback = feedback.filter((f) => f.status === "pending");
  const approvedFeedback = feedback.filter((f) => f.status === "approved");
  const rejectedFeedback = feedback.filter((f) => f.status === "rejected");

  // Show loading or redirect message if not admin
  if (isAuthLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
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

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <p className="text-muted-foreground">Loading feedback...</p>
          </div>
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
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">
                Feedback Management
              </h1>
              <p className="text-muted-foreground">
                Review and manage user feedback submissions
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchFeedback()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold"><AnimatedNumber value={pendingFeedback.length} /></div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  <AnimatedNumber value={approvedFeedback.length} />
                </div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  <AnimatedNumber value={rejectedFeedback.length} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-6">
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No feedback submissions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            feedback.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">
                          {item.name || "Anonymous"}
                        </CardTitle>
                        {getStatusBadge(item.status)}
                        {item.showOnHomepage && (
                          <Badge variant="outline" className="text-xs">
                            Homepage
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {item.role && `${item.role} • `}
                        {formatDate(item.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{item.rating}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {item.feedbackText}
                  </p>

                  {item.featuresUsed && item.featuresUsed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Features Used:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.featuresUsed.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={updatingId === item.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Feedback?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This feedback will be {item.showOnHomepage ? "displayed on the homepage" : "approved but not shown on homepage"}.
                              You can change this later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateStatus(item.id, "approved")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={updatingId === item.id}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Feedback?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This feedback will be rejected and will not appear on the homepage.
                              This action can be undone later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateStatus(item.id, "rejected")}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {item.status !== "pending" && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        {item.status === "approved" && item.showOnHomepage && " • Visible on homepage"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => fetchFeedback(feedback.length)} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

