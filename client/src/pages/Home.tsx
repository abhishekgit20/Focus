import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg1 from "@assets/generated_images/indian_wellness_scene_with_yoga_guru,_therapist_and_clients.png";
import heroBg2 from "@assets/generated_images/yoga_guru_teaching_meditation_with_counselor_present.png";
import heroBg3 from "@assets/generated_images/psychologist_counseling_client_with_yoga_background.png";
import { Heart, Sparkles, Shield, Flower, Users, IndianRupee } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const HERO_VIDEOS = [
  "https://videos.pexels.com/video-files/7211161/7211161-uhd_2560_1440_30fps.mp4", // Stream in nature
  "https://videos.pexels.com/video-files/7687610/7687610-uhd_2560_1440_30fps.mp4", // Stream through rocks
  "https://videos.pexels.com/video-files/7066617/7066617-uhd_2560_1440_30fps.mp4", // Timelapse of river
  "https://videos.pexels.com/video-files/8379440/8379440-uhd_2560_1440_30fps.mp4", // Flowing river
  "https://videos.pexels.com/video-files/7388473/7388473-uhd_2560_1440_30fps.mp4"  // Stream in woodland
];

const HERO_IMAGES = [heroBg1, heroBg2, heroBg3];

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [videoSrc, setVideoSrc] = useState("");
  const [imageSrc, setImageSrc] = useState(heroBg1);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Parallax effects
  const heroY = useTransform(scrollY, [0, 500], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  
  const textY = useTransform(scrollY, [0, 300], [0, 100]);
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    // Randomly select a video AND image on mount
    const randomVideoIndex = Math.floor(Math.random() * HERO_VIDEOS.length);
    setVideoSrc(HERO_VIDEOS[randomVideoIndex]);

    const randomImageIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    setImageSrc(HERO_IMAGES[randomImageIndex]);
  }, []);

  return (
    <PageTransition>
      <div ref={containerRef} className="relative overflow-hidden">
        {/* Parallax Hero Section */}
        <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900">
          {/* Background Layer - Moves slower */}
          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="absolute inset-0 z-0"
          >
             {/* Gradient Overlay - Always on top of media */}
             <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background z-20 pointer-events-none" />
            
            {/* Permanent Background Image - Serves as immediate visual and fallback */}
            <img 
              src={imageSrc} 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-cover z-0 brightness-75"
              loading="eager"
            />

            {/* Video Layer - Fades in over the image after a delay */}
            {videoSrc && (
              <video 
                src={videoSrc}
                autoPlay 
                muted 
                loop 
                playsInline
                preload="auto"
                onCanPlay={() => {
                  // Keep the image visible for 5 seconds before fading in the video
                  setTimeout(() => setIsVideoLoaded(true), 5000);
                }}
                className={`absolute inset-0 w-full h-full object-cover z-10 brightness-75 transition-opacity duration-[2000ms] ease-in-out ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </motion.div>

          {/* Content Layer - Moves faster (or normal speed) */}
          <motion.div 
            style={{ y: textY, opacity: textOpacity }}
            className="container mx-auto px-4 relative z-20 text-center"
          >
            <div className="max-w-4xl mx-auto">
              <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary-foreground font-medium mb-6 backdrop-blur-sm border border-primary/20">
                Integrated Mental Health for India
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-foreground drop-shadow-sm">
                Ancient Wisdom Meets <br />
                <span className="text-primary italic">Modern Care</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
                Connect with verified psychiatrists, therapists, and yoga gurus. 
                Experience holistic healing with our Bhagavad Gita-inspired AI guide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/therapists">
                  <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all border-none">
                    Find Professionals
                  </Button>
                </Link>
                <Link href="/chatbot">
                  <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-6 border-2 border-foreground/20 text-foreground bg-background/50 backdrop-blur-sm hover:bg-foreground/5 hover:text-primary hover:border-primary transition-all">
                    Chat with Gita Bot
                  </Button>
                </Link>
              </div>
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
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
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
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: 0.2 }}
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
                      transition={{ delay: 0.4 + (i * 0.1) }}
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
                  icon: <Sparkles className="w-8 h-8 text-primary-foreground" />,
                  title: "Gita Wisdom Bot",
                  desc: "Find peace and clarity through AI guidance based on the teachings of the Bhagavad Gita.",
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
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  whileHover={{ y: -10 }}
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
      </div>
    </PageTransition>
  );
}
