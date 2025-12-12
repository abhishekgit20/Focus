import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg from "@assets/generated_images/indian_wellness_hero.png";
import { Heart, Sparkles, Shield, Flower, Users, IndianRupee } from "lucide-react";

export default function Home() {
  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                Integrated Mental Health for India
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-primary-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                Ancient Wisdom Meets <br />
                <span className="text-primary italic">Modern Care</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                Connect with verified psychiatrists, therapists, and yoga gurus. 
                Experience holistic healing with our Bhagavad Gita-inspired AI guide and affordable care plans designed for every Indian home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <Link href="/therapists">
                  <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                    Find Professionals
                  </Button>
                </Link>
                <Link href="/chatbot">
                  <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-6 border-2 hover:bg-accent hover:text-accent-foreground transition-all">
                    Chat with Gita Bot
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Background Image with Fade */}
          <div className="absolute top-0 inset-x-0 h-full -z-10 opacity-30">
            <img 
              src={heroBg} 
              alt="Indian Wellness" 
              className="w-full h-full object-cover mask-image-gradient"
              style={{ maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)" }}
            />
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6 font-serif">Bridging the Gap in Mental Healthcare</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">200 Million+ Affected</h3>
                      <p className="text-muted-foreground">Over 200 million people in India face mental health challenges with limited access to care.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">Breaking the Stigma</h3>
                      <p className="text-muted-foreground">We provide a private, safe space to seek help without judgment, especially for Tier 2 & 3 cities.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card p-8 rounded-3xl shadow-lg border">
                <h3 className="text-2xl font-bold mb-4 font-serif text-primary">The Focus Solution</h3>
                <p className="text-muted-foreground mb-6">
                  An integrated platform that combines clinical therapy with the healing power of yoga and mindfulness.
                </p>
                <ul className="space-y-3">
                  {["Multi-Language Support (Hindi, Tamil, Bengali, etc.)", "Verified Indian Professionals", "Affordable & Flexible Payment Plans", "Holistic Care: Yoga + Therapy"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features Intro */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 font-serif">Why Choose Focus?</h2>
              <p className="text-muted-foreground">Designed specifically for the Indian context.</p>
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
                <div key={i} className="p-8 rounded-2xl bg-muted/30 border border-muted hover:shadow-lg transition-all duration-300 group">
                  <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-serif">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
