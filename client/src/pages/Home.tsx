import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroBg from "@assets/generated_images/calm_abstract_hero_background.png";
import { ArrowRight, Sparkles, Heart, Shield } from "lucide-react";

export default function Home() {
  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                Mental Wellness Platform
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-primary-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                Find your inner <br />
                <span className="text-primary italic">calm and balance</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                Professional therapy, mindfulness resources, and an empathetic AI companion. 
                Everything you need to support your mental health journey in one peaceful place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <Link href="/therapists">
                  <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                    Find a Therapist
                  </Button>
                </Link>
                <Link href="/chatbot">
                  <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-6 border-2 hover:bg-accent hover:text-accent-foreground transition-all">
                    Chat with AI Guide
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Background Image with Fade */}
          <div className="absolute top-0 inset-x-0 h-full -z-10 opacity-40">
            <img 
              src={heroBg} 
              alt="Calm Background" 
              className="w-full h-full object-cover mask-image-gradient"
              style={{ maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)" }}
            />
          </div>
        </section>

        {/* Features Intro */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Heart className="w-8 h-8 text-secondary-foreground" />,
                  title: "Compassionate Care",
                  desc: "Connect with licensed therapists who understand your unique journey.",
                  color: "bg-secondary/20"
                },
                {
                  icon: <Sparkles className="w-8 h-8 text-primary-foreground" />,
                  title: "AI Companion",
                  desc: "24/7 support from our empathetic AI guide for those moments you need to talk.",
                  color: "bg-primary/20"
                },
                {
                  icon: <Shield className="w-8 h-8 text-orange-600" />,
                  title: "Safe & Private",
                  desc: "Your mental health data is encrypted and completely confidential.",
                  color: "bg-orange-100"
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
