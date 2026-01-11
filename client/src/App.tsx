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
import { Loader2 } from "lucide-react";

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
const Profile = lazy(() => import("@/pages/Profile"));
const ProfessionalDashboard = lazy(() => import("@/pages/ProfessionalDashboard"));
const AdminFeedback = lazy(() => import("@/pages/AdminFeedback"));
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
          <Route path="/register" component={Register} />
          <Route path="/profile" component={Profile} />
          <Route path="/partner" component={PartnerWithUs} />
          <Route path="/partner-with-us" component={PartnerWithUsOrganizations} />
          <Route path="/wallet" component={WalletPage} />
          <Route path="/professional-dashboard" component={ProfessionalDashboard} />
          <Route path="/admin/feedback" component={AdminFeedback} />
          <Route path="/formula-guide" component={FormulaGuide} />
          <Route path="/consultation/:professionalId/:type" component={Consultation} />
          <Route path="/professional-chat/:sessionId" component={ProfessionalChat} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();
  
  const isFullscreenPage = location.startsWith("/consultation") || location.startsWith("/professional-chat");

  useEffect(() => {
    // Preload critical images for Services and Home page
    const imagesToPreload = [
      yogaImg, therapyImg, chatImg,
      heroBg1, heroBg2, heroBg3
    ];
    
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Simulate initial loading for the "OM" splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Reduced from 2500ms for faster entry
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <SplashScreen key="splash" />
          ) : (
            <div className="min-h-screen flex flex-col font-sans bg-background text-foreground relative animate-in fade-in duration-700">
              {!isFullscreenPage && <Navbar />}
              <main className="flex-grow">
                <Router />
              </main>
              {!isFullscreenPage && <Footer />}
              {!isFullscreenPage && <ChatWidget />}
            </div>
          )}
        </AnimatePresence>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
