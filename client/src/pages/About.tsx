import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";

export default function About() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          
          <div>
            <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">Our Mission</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-serif text-primary-foreground">
              Making mental wellness accessible to everyone
            </h1>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              SereneMind was founded on the belief that mental health support should be calm, accessible, and stigmatized-free. 
              We combine cutting-edge technology with compassionate human care to create a safe harbor for your mind.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Whether you need a professional therapist, a quick mindfulness break, or just someone to listen at 3 AM, we are here for you.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-foreground">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Us</p>
                  <p className="text-muted-foreground">support@serenemind.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Call Us</p>
                  <p className="text-muted-foreground">+1 (888) 123-4567</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-3xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6 font-serif">Get in Touch</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input placeholder="jane@example.com" />
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
    </PageTransition>
  );
}
