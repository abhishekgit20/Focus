import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wind, Flower2, Heart, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

type PracticeType = "breathing" | "grounding" | "gratitude" | "meditation";

interface Practice {
  id: PracticeType;
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const PRACTICES: Practice[] = [
  {
    id: "breathing",
    title: "One-Breath Reset",
    description: "A single deep breath to center yourself. Inhale slowly, hold, exhale gently.",
    duration: "30 seconds",
    icon: <Wind className="w-5 h-5" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "grounding",
    title: "2-Minute Grounding",
    description: "Notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.",
    duration: "2 minutes",
    icon: <Flower2 className="w-5 h-5" />,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    id: "gratitude",
    title: "Single Gratitude Line",
    description: "Write one thing you're grateful for today. Simple and meaningful.",
    duration: "1 minute",
    icon: <Heart className="w-5 h-5" />,
    color: "text-pink-700",
    bgColor: "bg-pink-50 border-pink-200",
  },
  {
    id: "meditation",
    title: "Quick Meditation",
    description: "A brief moment of stillness. Close your eyes, breathe, and be present.",
    duration: "2 minutes",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
];

export function MicroPractices() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activePractice, setActivePractice] = useState<PracticeType | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const practiceMutation = useMutation({
    mutationFn: async (practiceType: PracticeType) => {
      const res = await fetch("/api/micro-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          practiceType,
          durationSeconds: practiceType === "breathing" ? 30 : practiceType === "gratitude" ? 60 : 120,
        }),
      });
      if (!res.ok) throw new Error("Failed to record practice");
      return res.json();
    },
    onSuccess: () => {
      // Prefix match: also invalidates Profile.tsx's ["/api/micro-practices", 30] query.
      queryClient.invalidateQueries({ queryKey: ["/api/micro-practices"] });
      setIsCompleting(false);
      setActivePractice(null);
      toast({
        title: "Well done",
        description: "You took a moment for yourself. That matters.",
        duration: 3000,
      });
    },
    onError: () => {
      setIsCompleting(false);
      toast({
        title: "That's okay",
        description: "The practice itself is what matters, not the recording.",
        duration: 3000,
      });
    },
  });

  const handleStartPractice = (practice: Practice) => {
    setActivePractice(practice.id);
  };

  const handleCompletePractice = (practiceType: PracticeType) => {
    setIsCompleting(true);
    practiceMutation.mutate(practiceType);
  };

  const handleSkip = () => {
    setActivePractice(null);
    toast({
      title: "No pressure",
      description: "These practices are here whenever you need them.",
      duration: 3000,
    });
  };

  if (!isAuthenticated) return null;

  const currentPractice = activePractice ? PRACTICES.find(p => p.id === activePractice) : null;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-indigo-900">
            Gentle Practices
          </CardTitle>
          <CardDescription className="text-indigo-700">
            Short, simple practices you can do anytime. No pressure, no tracking required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activePractice ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRACTICES.map((practice) => (
                <motion.div
                  key={practice.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className={`${practice.bgColor} cursor-pointer transition-all hover:shadow-md`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`${practice.color} mt-0.5`}>
                          {practice.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${practice.color} mb-1`}>
                            {practice.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {practice.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{practice.duration}</span>
                            <Button
                              size="sm"
                              onClick={() => handleStartPractice(practice)}
                              className={`${practice.color.replace("text-", "bg-").replace("-700", "-600")} hover:opacity-90 text-white`}
                            >
                              Start
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : currentPractice ? (
            <PracticeGuide
              practice={currentPractice}
              onComplete={() => handleCompletePractice(currentPractice.id)}
              onSkip={handleSkip}
              isCompleting={isCompleting}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function PracticeGuide({
  practice,
  onComplete,
  onSkip,
  isCompleting,
}: {
  practice: Practice;
  onComplete: () => void;
  onSkip: () => void;
  isCompleting: boolean;
}) {
  const [step, setStep] = useState(0);

  const getPracticeContent = () => {
    switch (practice.id) {
      case "breathing":
        return {
          steps: [
            "Find a comfortable position",
            "Inhale slowly through your nose for 4 counts",
            "Hold your breath for 4 counts",
            "Exhale slowly through your mouth for 6 counts",
            "Notice how you feel",
          ],
        };
      case "grounding":
        return {
          steps: [
            "Look around and name 5 things you can see",
            "Listen and name 4 things you can hear",
            "Notice 3 things you can feel (texture, temperature)",
            "Identify 2 things you can smell",
            "Name 1 thing you can taste",
          ],
        };
      case "gratitude":
        return {
          steps: [
            "Take a moment to reflect",
            "Think of one thing you're grateful for today",
            "It can be big or small",
            "Write it down if you'd like, or just hold it in your heart",
          ],
        };
      case "meditation":
        return {
          steps: [
            "Sit or lie down comfortably",
            "Close your eyes gently",
            "Take a few natural breaths",
            "Simply notice your breath without changing it",
            "When your mind wanders, gently return to your breath",
            "Open your eyes when you're ready",
          ],
        };
      default:
        return { steps: [] };
    }
  };

  const content = getPracticeContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${practice.color} flex items-center gap-2`}>
            {practice.icon}
            {practice.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{practice.description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={isCompleting}>
          Skip
        </Button>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        {step < content.steps.length ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / content.steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {step + 1} / {content.steps.length}
              </span>
            </div>

            <motion.p
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg text-gray-800 text-center py-8"
            >
              {content.steps[step]}
            </motion.p>

            <div className="flex gap-2 justify-center">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={isCompleting}
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={() => {
                  if (step < content.steps.length - 1) {
                    setStep(step + 1);
                  } else {
                    onComplete();
                  }
                }}
                disabled={isCompleting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {step < content.steps.length - 1 ? "Next" : "Complete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-4xl mb-4"
            >
              ✨
            </motion.div>
            <p className="text-lg text-gray-800 mb-4">
              You took a moment for yourself. That's meaningful.
            </p>
            <Button
              onClick={onComplete}
              disabled={isCompleting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isCompleting ? "Saving..." : "Done"}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}



