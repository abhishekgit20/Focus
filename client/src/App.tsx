import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

// Eager load core pages for instant navigation
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Therapists from "@/pages/Therapists";
import Profile from "@/pages/Profile";

// Lazy load less critical pages
const Chatbot = lazy(() => import("@/pages/Chatbot"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const About = lazy(() => import("@/pages/About"));
const FormulaGuide = lazy(() => import("@/pages/FormulaGuide"));
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
          <Route path="/about" component={About} />
          <Route path="/chatbot" component={Chatbot} />
          <Route path="/profile" component={Profile} />
          <Route path="/formula-guide" component={FormulaGuide} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

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
              <Navbar />
              <main className="flex-grow">
                <Router />
              </main>
              <Footer />
              <ChatWidget />
            </div>
          )}
        </AnimatePresence>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
