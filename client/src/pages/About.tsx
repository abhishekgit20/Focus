import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Target, TrendingUp, AlertTriangle } from "lucide-react";

export default function About() {
  return (
    <PageTransition>
      <div className="relative">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            
            <div>
            <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">Our Mission</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-serif text-foreground">
              Focus: Integrated Mental Health for India
            </h1>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              With over 200 million people in India affected by mental health disorders, the need for accessible infrastructure has never been greater. 
              Stigma, lack of resources in rural areas, and limited affordability create massive barriers to care.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              <strong className="text-foreground">Focus</strong> was built to solve this. We are bridging the gap by connecting patients with psychiatrists, psychologists, and yoga gurus through a single, holistic platform.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="bg-muted/30 p-6 rounded-2xl border">
                <Target className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Our Goal</h3>
                <p className="text-sm text-muted-foreground">To make mental healthcare accessible, affordable, and destigmatized for every Indian, from metros to villages.</p>
              </div>
              <div className="bg-muted/30 p-6 rounded-2xl border">
                <TrendingUp className="w-8 h-8 text-secondary-foreground mb-4" />
                <h3 className="font-bold mb-2">Market Growth</h3>
                <p className="text-sm text-muted-foreground">Aligning with the National Mental Health Program (NMHP) to serve the growing demand in Tier 2 & 3 cities.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Email Us</p>
                  <p className="text-muted-foreground group-hover:text-primary transition-colors">support@focusindia.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground border border-secondary/30 group-hover:bg-secondary group-hover:text-secondary-foreground transition-all duration-300 shadow-sm">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Call Us</p>
                  <p className="text-muted-foreground group-hover:text-secondary-foreground transition-colors">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 border border-red-200 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 animate-pulse shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-600">Emergency Crisis Line</p>
                  <p className="text-muted-foreground font-medium">1800-599-0019 (24/7)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-3xl p-8 shadow-lg sticky top-24">
            <h3 className="text-2xl font-bold mb-6 font-serif">Contact Us</h3>
            <p className="text-muted-foreground mb-6">Have questions or want to partner with us? Reach out today.</p>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input placeholder="Aditya" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input placeholder="Kumar" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="aditya@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea placeholder="How can we help you?" className="min-h-[120px]" />
              </div>
              <Button className="w-full rounded-full py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                Send Message
              </Button>
            </form>
          </div>

        </div>
      </div>
    </div>
    </PageTransition>
  );
}
