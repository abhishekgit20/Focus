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

// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/Home"));
const Services = lazy(() => import("@/pages/Services"));
const Therapists = lazy(() => import("@/pages/Therapists"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const About = lazy(() => import("@/pages/About"));
const Profile = lazy(() => import("@/pages/Profile"));
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
    // Simulate initial loading for the "OM" splash screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
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
