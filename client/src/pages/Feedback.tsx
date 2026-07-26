import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Send, Info, LogIn, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = ["Therapist Consultation", "Yoga Sessions", "Gita Wisdom Bot", "Journaling", "Crisis Support", "Other"];

export default function Feedback() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [featuresUsed, setFeaturesUsed] = useState<string[]>([]);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill name from logged-in user
  useEffect(() => {
    if (user?.fullName) {
      setName(user.fullName);
    }
  }, [user]);

  const handleFeatureToggle = (feature: string) => {
    setFeaturesUsed((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to submit feedback.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating for your experience.",
        variant: "destructive",
      });
      return;
    }

    if (!feedbackText.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please share your feedback with us.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for session cookies
        body: JSON.stringify({
          name: name.trim() || null,
          role: role.trim() || null,
          rating,
          feedbackText: feedbackText.trim(),
          featuresUsed,
          showOnHomepage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 400) {
          const errorMessage = data.message || data.error || "Please check your input and try again.";
          throw new Error(errorMessage);
        }
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Required",
            description: "Please log in to submit feedback.",
            variant: "destructive",
          });
          setLocation("/login");
          return;
        }

        // Handle other errors
        throw new Error(data.message || data.error || "Failed to submit feedback");
      }

      // Success response
      toast({
        title: "Thank you for your feedback!",
        description: data.message || "Your insights help us improve Focus for everyone.",
      });

      // Reset form
      setRating(0);
      setHoveredRating(0);
      setName("");
      setRole("");
      setFeedbackText("");
      setFeaturesUsed([]);
      setShowOnHomepage(false);

      // Redirect after a delay
      setTimeout(() => setLocation("/"), 2000);
    } catch (error: any) {
      console.error("Feedback submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-muted/20 py-16 px-4">
          <div className="container mx-auto max-w-2xl">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-muted/20 py-16 px-4">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-10">
              <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">Client Voices</span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 font-serif text-foreground">Share Your Experience</h1>
              <p className="text-muted-foreground text-lg">
                Your feedback shapes the future of mental healthcare in India. Tell us how Focus has helped you.
              </p>
            </div>

            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-2">Login Required</CardTitle>
                <CardDescription className="text-base">
                  Please log in to share your feedback and help us improve Focus.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="rounded-full px-8">
                    <LogIn className="w-5 h-5 mr-2" />
                    Log In to Continue
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign up here
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/20 py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">Client Voices</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 font-serif text-foreground">Share Your Experience</h1>
            <p className="text-muted-foreground text-lg">
              Your feedback shapes the future of mental healthcare in India. Tell us how Focus has helped you.
            </p>
          </div>

          <div className="bg-card border rounded-3xl p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Rating Section */}
              <div className="space-y-4 text-center">
                <Label className="text-lg font-medium">How would you rate your experience?</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="transition-all duration-200 hover:scale-110 focus:outline-none"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <Star 
                        className={`w-10 h-10 ${
                          star <= (hoveredRating || rating) 
                            ? "fill-orange-400 text-orange-400" 
                            : "text-muted-foreground/30"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground h-5 font-medium text-primary">
                  {rating === 5 ? "Excellent!" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : rating === 1 ? "Poor" : ""}
                </p>
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name (Optional)</Label>
                  <Input 
                    id="name" 
                    placeholder="E.g. Priya Sharma" 
                    className="h-12 rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input 
                    id="role" 
                    placeholder="E.g. Student, Professional" 
                    className="h-12 rounded-xl"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="What did you like? What can we improve? Your story matters."
                  className="min-h-[150px] rounded-xl resize-none text-base p-4"
                  required
                  maxLength={2000}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{feedbackText.length}/2000</p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">What features did you use?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {FEATURES.map((feature) => (
                    <label 
                      key={feature} 
                      className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={featuresUsed.includes(feature)}
                        onCheckedChange={() => handleFeatureToggle(feature)}
                      />
                      <span className="text-sm font-medium">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Public Display Checkbox */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="showOnHomepage"
                    checked={showOnHomepage}
                    onCheckedChange={(checked) => setShowOnHomepage(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor="showOnHomepage" 
                      className="text-sm font-medium cursor-pointer leading-relaxed"
                    >
                      I allow Focus to display my feedback publicly as a testimonial
                    </Label>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      All feedback is reviewed before being published.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all"
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? "Submitting..." : (
                  <span className="flex items-center gap-2">
                    Submit Feedback <Send className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
