import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Stethoscope, UserCheck, Heart, ArrowRight, CheckCircle2, Building2, Calendar, TrendingUp, ShieldCheck } from "lucide-react";
import heroBg from "@assets/generated_images/professional_indian_doctors_and_therapists_collaborating.png";
import dashboardImg from "@assets/generated_images/digital_dashboard_for_doctors_on_tablet.png";

export default function PartnerWithUs() {
  const [, setLocation] = useLocation();

  // There used to be a full registration form duplicated here that never
  // actually submitted anywhere (see git history). The real application --
  // specialization, qualification, and required document upload -- only
  // lives at /apply-professional, which is behind login. Rather than
  // duplicate that form, this page now just explains the process and sends
  // professionals there directly; ProtectedRoute already handles bouncing an
  // unauthenticated visitor to /login and back once they sign in.
  const goToApplication = () => setLocation("/apply-professional");

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40 z-10" />
          <img 
            src={heroBg} 
            alt="Medical Professionals" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="container mx-auto px-4 relative z-20">
            <div className="max-w-2xl">
              <span className="inline-block py-1 px-3 rounded-full bg-primary/20 text-primary-foreground font-medium mb-6 backdrop-blur-sm border border-primary/30">
                For Mental Health Professionals
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white font-serif leading-tight">
                Partner with <span className="text-primary">Focus</span> to Heal India
              </h1>
              <p className="text-xl text-white/90 mb-8 font-light">
                Join our network of verified psychiatrists, therapists, and yoga gurus. Expand your practice and reach millions who need your help.
              </p>
              <div className="flex gap-4">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-white px-8" onClick={goToApplication}>
                  Join Network
                </Button>
                <Button size="lg" variant="outline" className="rounded-full text-white border-white/30 hover:bg-white/10 px-8" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">How Focus Works for Partners</h2>
              <p className="text-muted-foreground text-lg">Four simple steps to grow your practice and help more people.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  icon: <UserCheck className="w-8 h-8 text-primary" />,
                  title: "Apply & Verify",
                  desc: "Sign in (or create an account), then submit your credentials and documents for our team to review."
                },
                {
                  icon: <Calendar className="w-8 h-8 text-secondary" />,
                  title: "Set Availability",
                  desc: "Manage your calendar and set your consultation hours easily."
                },
                {
                  icon: <TrendingUp className="w-8 h-8 text-green-600" />,
                  title: "Grow Practice",
                  desc: "Get discovered by patients looking for your specific expertise."
                },
                {
                  icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
                  title: "Secure Payment",
                  desc: "Receive payments directly to your account with our secure gateway."
                }
              ].map((step, i) => (
                <div key={i} className="bg-background p-8 rounded-2xl border shadow-sm hover:shadow-md transition-all text-center group">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 relative z-30">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Benefits Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border rounded-3xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold mb-6 font-serif">Why Partner with Us?</h3>
                <div className="space-y-6">
                  {[
                    {
                      icon: <UserCheck className="w-6 h-6 text-primary" />,
                      title: "Verified Profile Badge",
                      desc: "Stand out as a trusted professional with our verification system."
                    },
                    {
                      icon: <Building2 className="w-6 h-6 text-blue-500" />,
                      title: "Practice Management",
                      desc: "Integrated tools for scheduling, billing, and patient records."
                    },
                    {
                      icon: <Heart className="w-6 h-6 text-red-500" />,
                      title: "Holistic Network",
                      desc: "Collaborate with yoga gurus and other specialists for patient care."
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 bg-muted rounded-full p-2 h-fit">{item.icon}</div>
                      <div>
                        <h4 className="font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-sm font-medium text-primary mb-2">"Focus has transformed how I manage my practice. The patient matching is spot on."</p>
                  <p className="text-xs text-muted-foreground">- Dr. Rajesh Kumar, Psychiatrist</p>
                </div>
              </div>
            </div>

            {/* Application CTA */}
            <div className="lg:col-span-2">
              <div className="bg-background border rounded-3xl p-8 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Ready to Join?</h2>
                  <p className="text-muted-foreground">Here's exactly what happens when you apply -- no surprises.</p>
                </div>

                <div className="space-y-6 mb-8">
                  {[
                    {
                      title: "Sign in, or create a free account",
                      desc: "You'll need a Focus account before applying. If you don't have one yet, you can create it as part of this next step.",
                    },
                    {
                      title: "Complete your professional application",
                      desc: "Share your specialization, qualification, and experience, and upload your government ID and professional license.",
                    },
                    {
                      title: "Our team reviews your credentials",
                      desc: "A real person reviews every application manually -- you'll get an email once it's been approved or if we need more information.",
                    },
                    {
                      title: "Set up your profile and start practicing",
                      desc: "Once approved, configure your session pricing and availability, and your profile goes live to clients.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 text-lg rounded-full bg-primary hover:bg-primary/90"
                  onClick={goToApplication}
                >
                  Start Your Application <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Don't have a Focus account yet? No problem -- you can create one as part of this step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
