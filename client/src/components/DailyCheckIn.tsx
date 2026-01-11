import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Smile, Meh, Frown, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface CheckInData {
  feeling?: string;
  moodScore?: number;
  notes?: string;
}

const MOOD_OPTIONS = [
  { emoji: "😊", label: "Good", score: 8 },
  { emoji: "🙂", label: "Okay", score: 6 },
  { emoji: "😐", label: "Neutral", score: 5 },
  { emoji: "😔", label: "Low", score: 3 },
  { emoji: "💙", label: "Need support", score: 2 },
];

export function DailyCheckIn() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [feeling, setFeeling] = useState("");
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Check if user has already checked in today
  const { data: todayCheckIn } = useQuery({
    queryKey: ["/api/check-in/today"],
    queryFn: async () => {
      const res = await fetch("/api/check-in/today", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch check-in");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const hasCheckedInToday = !!todayCheckIn?.checkIn;

  // Submit check-in
  const checkInMutation = useMutation({
    mutationFn: async (data: CheckInData) => {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit check-in");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/recent"] });
      setIsOpen(false);
      setFeeling("");
      setSelectedMood(null);
      setNotes("");
      toast({
        title: "Thank you for checking in",
        description: "Your response helps us support you better.",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedMood && !feeling.trim() && !notes.trim()) {
      toast({
        title: "Take your time",
        description: "You can check in with just a feeling, emoji, or note. All optional.",
        duration: 4000,
      });
      return;
    }

    checkInMutation.mutate({
      feeling: feeling.trim() || undefined,
      moodScore: selectedMood || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleSkip = () => {
    setIsOpen(false);
    toast({
      title: "That's okay",
      description: "You can check in anytime you feel ready.",
      duration: 3000,
    });
  };

  if (!isAuthenticated) return null;

  // Show gentle reminder if not checked in today
  if (!hasCheckedInToday && !isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  How are you feeling today?
                </h3>
                <p className="text-sm text-blue-700">
                  A gentle check-in to help us support you better. Completely optional.
                </p>
              </div>
              <Button
                onClick={() => setIsOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Check In
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Show confirmation if already checked in
  if (hasCheckedInToday && !isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Heart className="w-4 h-4 fill-green-600" />
              <span className="text-sm font-medium">You've checked in today. Thank you for taking a moment for yourself.</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Check-in form
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-serif text-purple-900">
                    How are you feeling right now?
                  </CardTitle>
                  <CardDescription className="text-purple-700 mt-1">
                    Share as much or as little as feels right. This is just for you.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick mood selection */}
              <div>
                <label className="text-sm font-medium text-purple-900 mb-2 block">
                  Quick feeling (optional)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.score}
                      onClick={() => setSelectedMood(mood.score === selectedMood ? null : mood.score)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedMood === mood.score
                          ? "bg-purple-600 text-white shadow-md scale-105"
                          : "bg-white text-purple-700 hover:bg-purple-100 border border-purple-200"
                      }`}
                    >
                      <span className="mr-1">{mood.emoji}</span>
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div>
                <label className="text-sm font-medium text-purple-900 mb-2 block">
                  Or describe in words (optional)
                </label>
                <Textarea
                  placeholder="e.g., 'Feeling grateful today' or 'A bit anxious, but okay'"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  className="min-h-[60px] bg-white border-purple-200 focus:border-purple-400"
                  maxLength={200}
                />
                <p className="text-xs text-purple-600 mt-1">
                  {feeling.length}/200 characters
                </p>
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-sm font-medium text-purple-900 mb-2 block">
                  Anything else you'd like to note? (optional)
                </label>
                <Textarea
                  placeholder="Any thoughts, concerns, or things you're grateful for..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] bg-white border-purple-200 focus:border-purple-400"
                  maxLength={500}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={checkInMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {checkInMutation.isPending ? "Saving..." : "Save Check-In"}
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



