import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Clock, Activity, Award } from "lucide-react";

export default function FormulaGuide() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif mb-2">Progress Calculation Guide</h1>
          <p className="text-muted-foreground">Transparency in how we track your mental wellness journey.</p>
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground/80 italic">
              <strong className="not-italic">Remember:</strong> Progress is deeply personal. There's no right pace, no target to meet, and no comparison to others.
              These numbers simply reflect your journey — every small step forward is meaningful, and it's okay to take breaks when you need them.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Streaks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Self-Care Streak</CardTitle>
                  <CardDescription>Consistency Tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your streak counts consecutive days (ending today or yesterday) where you did
                <strong> at least one</strong> of the activities below. Missing a day resets it to zero —
                but there's no penalty beyond that, and starting again any time is completely fine.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Qualifying Activities:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Daily Mood Check-in</Badge>
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Journal Entry</Badge>
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Guided Practice (breathing, grounding, gratitude, meditation)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moments of growth */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Moments of Growth</CardTitle>
                  <CardDescription>A simple count, nothing more</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is the total count of guided practices you've completed plus journal entries
                you've written. It's intentionally simple — just a running tally of times you showed
                up for yourself, with no thresholds, levels, or badges attached.
              </p>
            </CardContent>
          </Card>

          {/* Mood Analysis */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Weekly Mood Analysis</CardTitle>
                  <CardDescription>Quantifying Emotions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Each daily check-in maps to a mood score, which we chart over your last 7 check-ins to
                show a trend rather than a single snapshot.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-green-50 border border-green-100">
                  <span className="font-medium text-green-800">Great / Happy</span>
                  <span className="font-mono font-bold text-green-600">8 - 10 Points</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-yellow-50 border border-yellow-100">
                  <span className="font-medium text-yellow-800">Okay / Neutral</span>
                  <span className="font-mono font-bold text-yellow-600">4 - 7 Points</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-100">
                  <span className="font-medium text-red-800">Stressed / Anxious</span>
                  <span className="font-mono font-bold text-red-600">1 - 3 Points</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total time invested */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Time Invested In You</CardTitle>
                  <CardDescription>Time Tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This adds up two real things: the duration of your completed professional sessions,
                and the time you've spent in guided practices (breathing, grounding, gratitude,
                meditation). We don't estimate or pad this number with anything else.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
