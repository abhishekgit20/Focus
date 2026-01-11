import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, TrendingUp, Clock, Activity, Zap, Brain } from "lucide-react";

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
          {/* Level System */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Level System</CardTitle>
                  <CardDescription>Experience Points (XP) & Progression</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How XP is Earned:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Daily Check-in: <span className="font-medium text-foreground">10 XP</span></li>
                  <li>Journal Entry: <span className="font-medium text-foreground">20 XP</span></li>
                  <li>Meditation Session: <span className="font-medium text-foreground">5 XP per minute</span></li>
                  <li>Therapy Session: <span className="font-medium text-foreground">100 XP</span></li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Level Thresholds:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <div className="font-bold">Level 1</div>
                    <div className="text-xs text-muted-foreground">0 - 100 XP</div>
                  </div>
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <div className="font-bold">Level 2</div>
                    <div className="text-xs text-muted-foreground">101 - 300 XP</div>
                  </div>
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <div className="font-bold">Level 3</div>
                    <div className="text-xs text-muted-foreground">301 - 600 XP</div>
                  </div>
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <div className="font-bold">Level 5+</div>
                    <div className="text-xs text-muted-foreground">1000+ XP</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streaks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Streaks</CardTitle>
                  <CardDescription>Consistency Tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                A streak is maintained by completing <strong>at least one</strong> meaningful activity within a 24-hour window (midnight to midnight local time).
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Qualifying Activities:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Mood Check-in</Badge>
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Meditation (&gt;5 mins)</Badge>
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Journaling</Badge>
                  <Badge variant="secondary" className="bg-white text-blue-700 hover:bg-white">Therapy Session</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Badges</CardTitle>
                  <CardDescription>Achievement Unlocks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">Consistency Badges</div>
                  <p className="text-xs text-muted-foreground">Awarded for 3, 7, 30, and 100 day streaks.</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">Mindfulness Master</div>
                  <p className="text-xs text-muted-foreground">Awarded for accumulating 10, 50, and 100 total meditation hours.</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">Journaling Journey</div>
                  <p className="text-xs text-muted-foreground">Awarded for 10, 50, and 100 total journal entries.</p>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="font-semibold text-sm mb-1">Early Bird</div>
                  <p className="text-xs text-muted-foreground">Completing a session before 8 AM for 5 days in a row.</p>
                </div>
              </div>
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
                We convert your daily qualitative check-ins into quantitative data points to visualize trends over time.
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

          {/* Total Practice & Meditation Minutes */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Total Practice & Meditation Minutes</CardTitle>
                  <CardDescription>Time Tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1 text-sm">Meditation Minutes</h4>
                <p className="text-sm text-muted-foreground">
                  Specifically tracks time spent in guided or unguided meditation sessions within the app. Timer must run to completion to count.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Total Practice Hours</h4>
                <p className="text-sm text-muted-foreground">
                  The cumulative sum of all wellness activities, including:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-2">
                  <li>Meditation Minutes</li>
                  <li>Yoga Session Duration</li>
                  <li>Therapy Session Duration</li>
                  <li>Estimated time spent journaling (avg. 5 mins per entry)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
