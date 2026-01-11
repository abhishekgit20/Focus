import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg1 from "@assets/generated_images/indian_wellness_scene_with_yoga_guru,_therapist_and_clients.png";
import heroBg2 from "@assets/generated_images/yoga_guru_teaching_meditation_with_counselor_present.png";
import heroBg3 from "@assets/generated_images/psychologist_counseling_client_with_yoga_background.png";
import { Heart, Sparkles, Shield, Flower, Users, IndianRupee, Quote, MessageCircle, BookOpen, Calendar, ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { CrisisBanner } from "@/components/CrisisBanner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const HERO_VIDEOS = [
  "https://videos.pexels.com/video-files/7211161/7211161-uhd_2560_1440_30fps.mp4", // Stream in nature
  "https://videos.pexels.com/video-files/7687610/7687610-uhd_2560_1440_30fps.mp4", // Stream through rocks
  "https://videos.pexels.com/video-files/7066617/7066617-uhd_2560_1440_30fps.mp4", // Timelapse of river
  "https://videos.pexels.com/video-files/8379440/8379440-uhd_2560_1440_30fps.mp4", // Flowing river
  "https://videos.pexels.com/video-files/7388473/7388473-uhd_2560_1440_30fps.mp4"  // Stream in woodland
];

const HERO_IMAGES = [heroBg1, heroBg2, heroBg3];

const DAILY_VERSES = [
  {
    text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
    source: "Bhagavad Gita, Chapter 2, Verse 47"
  },
  {
    text: "Lift yourself by yourself, do not demean yourself; for the self is the friend of the self, and the self is the enemy of the self.",
    source: "Bhagavad Gita, Chapter 6, Verse 5"
  },
  {
    text: "For him who has conquered the mind, the mind is the best of friends; but for one who has failed to do so, his very mind will be the greatest enemy.",
    source: "Bhagavad Gita, Chapter 6, Verse 6"
  },
  {
    text: "There is no possibility of one's becoming a yogi, O Arjuna, if one eats too much or eats too little, sleeps too much or does not sleep enough.",
    source: "Bhagavad Gita, Chapter 6, Verse 16"
  },
  {
    text: "From anger, delusion arises, and from delusion, bewilderment of memory. When memory is bewildered, intelligence is lost, and when intelligence is lost, one falls down again into the material pool.",
    source: "Bhagavad Gita, Chapter 2, Verse 63"
  },
  {
    text: "The peace of God is with them whose mind and soul are in harmony, who are free from desire and wrath, who know their own soul.",
    source: "Bhagavad Gita, Chapter 5, Verse 26"
  }
];

interface Testimonial {
  id: string;
  name: string | null;
  role: string | null;
  feedbackText: string;
  rating: number;
  createdAt: string;
}

// Default testimonials to ensure we always have 3 stories
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "default-1",
    name: "Priya",
    role: "Student",
    feedbackText: "Focus has been a lifeline during my toughest times. The combination of therapy and yoga sessions helped me manage my anxiety in ways I never thought possible. The therapists are compassionate and understanding.",
    rating: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    name: "Rajesh",
    role: "Professional",
    feedbackText: "As someone who struggled with work-related stress, Focus provided me with practical tools and support. The mindfulness sessions and professional guidance have transformed how I handle daily challenges.",
    rating: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    name: "Anita",
    role: "Parent",
    feedbackText: "The accessibility and affordability of Focus made mental health support possible for my family. The multi-language support and flexible scheduling fit perfectly into our busy lives. Truly grateful for this platform.",
    rating: 5,
    createdAt: new Date().toISOString(),
  },
];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [videoSrc, setVideoSrc] = useState("");
  const [imageSrc, setImageSrc] = useState(heroBg1);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [todaysVerse, setTodaysVerse] = useState(DAILY_VERSES[0]);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch testimonials using React Query for better caching
  const { data: testimonialsData, isLoading: isLoadingTestimonials } = useQuery<{ testimonials: Testimonial[] }>({
    queryKey: ["/api/testimonials"],
    queryFn: async () => {
      const response = await fetch("/api/testimonials");
      if (!response.ok) throw new Error("Failed to fetch testimonials");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Memoize testimonials processing
  const testimonials = useMemo(() => {
    const fetchedTestimonials = testimonialsData?.testimonials || [];
    let finalTestimonials = [...fetchedTestimonials];
    
    if (finalTestimonials.length < 3) {
      const needed = 3 - finalTestimonials.length;
      const defaultsToAdd = DEFAULT_TESTIMONIALS.slice(0, needed);
      finalTestimonials = [...finalTestimonials, ...defaultsToAdd];
    } else {
      finalTestimonials = finalTestimonials.slice(0, 3);
    }
    
    return finalTestimonials;
  }, [testimonialsData]);

  // Clear cached user data if localStorage indicates user is logged out
  useEffect(() => {
    const isLoggedInLocal = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedInLocal && user) {
      // localStorage says logged out but we have cached user data - clear it
      queryClient.setQueryData(["/api/auth/user"], null);
    }
  }, [user, queryClient]);
  
  // Parallax effects - memoized to prevent recalculation
  const heroY = useTransform(scrollY, [0, 500], [0, 200], { clamp: true });
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0], { clamp: true });
  
  const textY = useTransform(scrollY, [0, 300], [0, 100], { clamp: true });
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0], { clamp: true });

  // Initialize random content once on mount
  useEffect(() => {
    // Randomly select a video AND image on mount
    const randomVideoIndex = Math.floor(Math.random() * HERO_VIDEOS.length);
    setVideoSrc(HERO_VIDEOS[randomVideoIndex]);

    const randomImageIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    setImageSrc(HERO_IMAGES[randomImageIndex]);

    // Random verse
    const randomVerseIndex = Math.floor(Math.random() * DAILY_VERSES.length);
    setTodaysVerse(DAILY_VERSES[randomVerseIndex]);

    // Handle OAuth success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth_success') === 'true') {
      // Fetch user data and update localStorage
      fetch("/api/auth/user", { credentials: "include" })
        .then((res) => res.json())
        .then((user) => {
          if (user && user.id) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', user.role || 'client');
            localStorage.setItem('userName', user.fullName || 'User');
            localStorage.setItem('userEmail', user.email || '');
            window.dispatchEvent(new Event('auth-change'));
            // Redirect based on role
            setTimeout(() => {
              if (user.role === 'admin') {
                window.location.href = '/admin/feedback';
              } else if (user.role === 'professional') {
                window.location.href = '/professional-dashboard';
              } else {
                window.location.href = '/profile';
              }
            }, 500);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch user after OAuth:", error);
        });
      // Remove query param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Memoized helper function to truncate text
  const truncateText = useCallback((text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  }, []);

  return (
    <PageTransition>
      <div ref={containerRef} className="relative overflow-hidden">
        <CrisisBanner />
        
        {/* Parallax Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900">
          {/* Background Layer - Moves slower */}
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="absolute inset-0 z-0"
          >
             {/* Gradient Overlay - Only at the bottom for text transition */}
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-20 pointer-events-none" />
            
            {/* Permanent Background Image - Serves as immediate visual and fallback */}
            <img 
              src={imageSrc} 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-cover z-0"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />

            {/* Video Layer - Fades in over the image after a delay */}
            {videoSrc && (
              <video 
                src={videoSrc}
                autoPlay 
                muted 
                loop 
                playsInline
                preload="metadata" // Changed from "auto" to reduce initial load
                onCanPlay={() => {
                  // Keep the image visible for 3 seconds before fading in the video (reduced from 5)
                  setTimeout(() => setIsVideoLoaded(true), 3000);
                }}
                onError={() => {
                  // If video fails to load, keep image visible
                  setIsVideoLoaded(false);
                }}
                className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-[2000ms] ease-in-out ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </motion.div>

          {/* Content Layer - Moves faster (or normal speed) */}
          <motion.div 
            style={{ y: textY, opacity: textOpacity }}
            className="container mx-auto px-4 relative z-20 text-center"
          >
            <div className="max-w-4xl mx-auto">
              {!isAuthLoading && isAuthenticated && user && user.id ? (
                // Logged-in experience - supportive tone
                <>
                  <span className="inline-block py-1 px-3 rounded-full bg-white/20 text-white font-medium mb-6 backdrop-blur-sm border border-white/30 shadow-sm">
                    Welcome back
                  </span>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white drop-shadow-xl filter">
                    Welcome back, {user.fullName?.split(' ')[0] || 'there'} <br />
                    <span className="text-orange-300 italic text-3xl md:text-5xl lg:text-6xl">How are you feeling today?</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium drop-shadow-md">
                    Take a moment to check in with yourself. We're here to support you on your journey.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/chatbot">
                      <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all border-none gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Continue Your Chat
                      </Button>
                    </Link>
                    <Link href="/therapists">
                      <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all gap-2">
                        <Calendar className="w-5 h-5" />
                        Book a Session
                      </Button>
                    </Link>
                    <Link href="/profile">
                      <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all gap-2">
                        <ArrowRight className="w-5 h-5" />
                        My Journey
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                // Public experience - marketing tone
                <>
                  <span className="inline-block py-1 px-3 rounded-full bg-white/20 text-white font-medium mb-6 backdrop-blur-sm border border-white/30 shadow-sm">
                    Integrated Mental Health for India
                  </span>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white drop-shadow-xl filter">
                    Ancient Wisdom Meets <br />
                    <span className="text-orange-300 italic">Modern Care</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium drop-shadow-md">
                    Connect with verified psychiatrists, therapists, and yoga gurus. 
                    Experience holistic healing with our Bhagavad Gita-inspired AI guide.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/therapists">
                      <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all border-none">
                        Find Professionals
                      </Button>
                    </Link>
                    <Link href="/chatbot">
                      <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-white hover:bg-white/90 text-primary font-bold shadow-lg hover:shadow-xl transition-all border-none">
                        Chat with Gita Bot
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </section>

        {/* Problem & Solution - Floating Cards Parallax */}
        <section className="py-24 bg-muted/20 relative z-30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6 font-serif">Bridging the Gap in Mental Healthcare</h2>
                <div className="space-y-8">
                  <div className="flex gap-4 group">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Users className="w-7 h-7 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">200 Million+ Affected</h3>
                      <p className="text-muted-foreground leading-relaxed">Over 200 million people in India face mental health challenges with limited access to care.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 group">
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Breaking the Stigma</h3>
                      <p className="text-muted-foreground leading-relaxed">We provide a private, safe space to seek help without judgment, especially for Tier 2 & 3 cities.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card p-10 rounded-[2rem] shadow-xl border border-primary/10 relative overflow-hidden"
              >
                {/* Decorative background circle */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                
                <h3 className="text-2xl font-bold mb-6 font-serif text-primary relative z-10">The Focus Solution</h3>
                <p className="text-muted-foreground mb-8 text-lg relative z-10">
                  An integrated platform that combines clinical therapy with the healing power of yoga and mindfulness.
                </p>
                <ul className="space-y-4 relative z-10">
                  {["Multi-Language Support (Hindi, Tamil, Bengali, Telugu, Marathi & more)", "Verified Indian Professionals", "Affordable & Flexible Payment Plans", "Holistic Care: Yoga + Therapy"].map((item, i) => (
                    <motion.li 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + (i * 0.05) }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0" />
                      <span className="font-medium">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Daily Wisdom Section */}
        <section className="py-20 bg-primary/5 border-y border-primary/10">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">Daily Wisdom</span>
              <h2 className="text-3xl font-serif font-bold mb-8">Verse of the Day</h2>
              <blockquote className="text-2xl md:text-3xl font-serif italic text-muted-foreground leading-relaxed mb-6">
                "{todaysVerse.text}"
              </blockquote>
              <cite className="text-lg font-medium text-primary not-italic block mb-8">— {todaysVerse.source}</cite>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-background relative z-30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Stories of Hope</h2>
              <p className="text-muted-foreground text-lg">Real people, real recovery.</p>
            </div>
            
            {isLoadingTestimonials ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading testimonials...</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-8">
                  {testimonials.map((testimonial, i) => (
                    <motion.div 
                      key={testimonial.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      viewport={{ once: true, margin: "-50px" }}
                      className="bg-muted/30 p-8 rounded-3xl border relative flex flex-col h-full"
                    >
                      <Quote className="w-10 h-10 text-primary/40 mb-4" />
                      <p className="text-lg mb-6 text-foreground font-medium italic relative z-10 flex-grow leading-relaxed">
                        "{truncateText(testimonial.feedbackText)}"
                      </p>
                      <div>
                        <h4 className="font-bold text-foreground">
                          {testimonial.name || "Anonymous"}
                        </h4>
                        {testimonial.role && (
                          <p className="text-sm text-muted-foreground font-medium">
                            {testimonial.role}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <Link href="/feedback">
                    <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary gap-2">
                      <MessageCircle className="w-4 h-4" /> Share Your Story
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Features Intro - Staggered Cards */}
        <section className="py-24 bg-background relative z-30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold mb-4 font-serif"
              >
                Why Choose Focus?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-lg"
              >
                Designed specifically for the Indian context.
              </motion.p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Flower className="w-8 h-8 text-secondary-foreground" />,
                  title: "Holistic Healing",
                  desc: "Integrating modern psychology with ancient Indian wisdom of Yoga and Meditation.",
                  color: "bg-secondary/20"
                },
                {
                  icon: <Sparkles className="w-8 h-8 text-primary" />,
                  title: "Gita Bot",
                  desc: "Find peace and clarity through ChatGPT-powered AI guidance based on the teachings of the Bhagavad Gita.",
                  color: "bg-primary/20"
                },
                {
                  icon: <IndianRupee className="w-8 h-8 text-green-600" />,
                  title: "Affordable Care",
                  desc: "Flexible payment plans and corporate wellness solutions designed for every budget.",
                  color: "bg-green-100"
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-3xl bg-muted/30 border border-muted hover:shadow-xl transition-all duration-300 group"
                >
                  <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-serif">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Step by Step */}
        <section className="py-24 bg-muted/20 relative z-30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">How Focus Works</h2>
              <p className="text-muted-foreground text-lg">Your journey to wellness in 4 simple steps.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-0" />

              {[
                { step: "01", title: "Choose Your Guide", desc: "Browse verified psychologists, therapists, or yoga gurus based on your needs." },
                { step: "02", title: "Book a Session", desc: "Schedule a video, audio, or chat session at a time that works for you." },
                { step: "03", title: "Begin Healing", desc: "Connect securely and start your journey towards mental peace and clarity." },
                { step: "04", title: "Track Your Journey", desc: "Monitor your mood, journal your thoughts, and earn XP as you heal.", link: "/profile" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className="relative z-10 text-center flex flex-col items-center h-full"
                >
                  {item.link ? (
                    <Link href={item.link}>
                      <div className="w-24 h-24 mx-auto rounded-full bg-background border-4 border-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-6 shadow-sm cursor-pointer hover:border-primary/40 hover:scale-105 transition-all">
                        {item.step}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-full bg-background border-4 border-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-6 shadow-sm">
                      {item.step}
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold mb-3 font-serif">
                    {item.link ? (
                      <Link href={item.link} className="hover:text-primary transition-colors">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
