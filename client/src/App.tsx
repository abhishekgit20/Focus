import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect, lazy, Suspense } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { SplashScreen } from "@/components/SplashScreen";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { useUserInboxSocket } from "@/hooks/useUserInboxSocket";

// One live connection for the whole app, mounted once here rather than
// per-page — see useUserInboxSocket for why: a single, always-on
// subscription that keeps every page's cached data honest, instead of each
// page needing to remember to open its own and invalidate the right things.
function GlobalRealtimeSync() {
  useUserInboxSocket();
  return null;
}

// Images to preload
import yogaImg from "@assets/generated_images/yoga_session_illustration.png";
import therapyImg from "@assets/generated_images/therapy_session_illustration.png";
import chatImg from "@assets/generated_images/wisdom_chatbot_avatar.png";
import heroBg1 from "@assets/generated_images/indian_wellness_scene_with_yoga_guru,_therapist_and_clients.png";
import heroBg2 from "@assets/generated_images/yoga_guru_teaching_meditation_with_counselor_present.png";
import heroBg3 from "@assets/generated_images/psychologist_counseling_client_with_yoga_background.png";

// Eager load only critical pages for instant navigation
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Therapists from "@/pages/Therapists";

// Lazy load all other pages for better performance
const Chatbot = lazy(() => import("@/pages/Chatbot"));
const Login = lazy(() => import("@/pages/Login"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const Register = lazy(() => import("@/pages/Register"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const ResourceDetail = lazy(() => import("@/pages/ResourceDetail"));
const ReadsDetail = lazy(() => import("@/pages/ReadsDetail"));
const About = lazy(() => import("@/pages/About"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const FormulaGuide = lazy(() => import("@/pages/FormulaGuide"));
const PartnerWithUs = lazy(() => import("@/pages/PartnerWithUs"));
const PartnerWithUsOrganizations = lazy(() => import("@/pages/PartnerWithUsOrganizations"));
const WalletPage = lazy(() => import("@/pages/Wallet"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProfessionalDashboard = lazy(() => import("@/pages/ProfessionalDashboard"));
const AdminFeedback = lazy(() => import("@/pages/AdminFeedback"));
const AdminCrisisAlerts = lazy(() => import("@/pages/AdminCrisisAlerts"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminApplications = lazy(() => import("@/pages/AdminApplications"));
const AdminPayments = lazy(() => import("@/pages/AdminPayments"));
const ApplyProfessional = lazy(() => import("@/pages/ApplyProfessional"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
const Consultation = lazy(() => import("@/pages/Consultation"));
const ProfessionalChat = lazy(() => import("@/pages/ProfessionalChat"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Switch location={location} key={location}>
          <Route path="/" component={Home} />
          <Route path="/services" component={Services} />
          <Route path="/therapists" component={Therapists} />
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/recommendations/:id" component={ResourceDetail} />
          <Route path="/reads/:id" component={ReadsDetail} />
          <Route path="/about" component={About} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/chatbot" component={Chatbot} />
          <Route path="/login" component={Login} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/register" component={Register} />
          <Route path="/apply-professional">
            <ProtectedRoute allowedRoles={["client"]}>
              <ApplyProfessional />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute allowedRoles={["client"]}>
              <Profile />
            </ProtectedRoute>
          </Route>
          <Route path="/partner" component={PartnerWithUs} />
          <Route path="/partner-with-us" component={PartnerWithUsOrganizations} />
          <Route path="/wallet">
            <ProtectedRoute allowedRoles={["client"]}>
              <WalletPage />
            </ProtectedRoute>
          </Route>
          <Route path="/subscription">
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          </Route>
          <Route path="/professional-dashboard/:tab?">
            <ProtectedRoute allowedRoles={["professional"]}>
              <ProfessionalDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/feedback">
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminFeedback />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/crisis-alerts">
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminCrisisAlerts />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/analytics">
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminAnalytics />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/applications">
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminApplications />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/payments">
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <AdminPayments />
            </ProtectedRoute>
          </Route>
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/formula-guide" component={FormulaGuide} />
          <Route path="/consultation/:sessionId">
            <ProtectedRoute>
              <Consultation />
            </ProtectedRoute>
          </Route>
          <Route path="/professional-chat/:sessionId">
            <ProtectedRoute>
              <ProfessionalChat />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();
  
  // Pages that ship their own app-shell chrome (brand bar, nav, profile menu)
  // instead of the public marketing Navbar/Footer.
  const hideGlobalNav =
    location.startsWith("/consultation") ||
    location.startsWith("/professional-chat") ||
    location.startsWith("/professional-dashboard");

  useEffect(() => {
    // Preload critical images for Services and Home page
    const imagesToPreload = [
      yogaImg, therapyImg, chatImg,
      heroBg1, heroBg2, heroBg3
    ];

    // Splash duration is tied to real image-load progress, not a fixed guess:
    // a floor so the brand animation isn't cut off mid-transition on fast
    // connections, a ceiling so a slow/failed load can't hang the app open.
    const MIN_SPLASH_MS = 900; // covers the wordmark's ~800ms entrance animation
    const MAX_SPLASH_MS = 1500;
    const start = Date.now();
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      setTimeout(() => {
        if (!cancelled) setIsLoading(false);
      }, remaining);
    };

    const loadPromises = imagesToPreload.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    );

    const maxTimer = setTimeout(finish, MAX_SPLASH_MS);
    Promise.all(loadPromises).then(() => {
      clearTimeout(maxTimer);
      finish();
    });

    return () => {
      cancelled = true;
      clearTimeout(maxTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalRealtimeSync />
        <AnimatePresence mode="wait">
          {isLoading ? (
            <SplashScreen key="splash" />
          ) : (
            <div className="min-h-screen flex flex-col font-sans bg-background text-foreground relative animate-in fade-in duration-700">
              {!hideGlobalNav && <Navbar />}
              <main className="flex-grow">
                <Router />
              </main>
              {!hideGlobalNav && <Footer />}
              {!hideGlobalNav && <ChatWidget />}
            </div>
          )}
        </AnimatePresence>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
