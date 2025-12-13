import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Send, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Thank you for your feedback!",
        description: "Your insights help us improve Focus for everyone.",
      });
      setTimeout(() => setLocation("/"), 2000);
    }, 1500);
  };

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
                  <Input id="name" placeholder="E.g. Priya Sharma" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" placeholder="E.g. Student, Professional" className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea 
                  id="feedback" 
                  placeholder="What did you like? What can we improve? Your story matters." 
                  className="min-h-[150px] rounded-xl resize-none text-base p-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">What features did you use?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Therapist Consultation", "Yoga Sessions", "Gita Wisdom Bot", "Journaling", "Crisis Support", "Other"].map((feature) => (
                    <label key={feature} className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                      <span className="text-sm font-medium">{feature}</span>
                    </label>
                  ))}
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
