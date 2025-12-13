import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Stethoscope, UserCheck, Heart, ArrowRight, CheckCircle2, Building2, Calendar, TrendingUp, ShieldCheck } from "lucide-react";
import heroBg from "@assets/generated_images/professional_indian_doctors_and_therapists_collaborating.png";
import dashboardImg from "@assets/generated_images/digital_dashboard_for_doctors_on_tablet.png";

export default function PartnerWithUs() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Application Submitted Successfully",
        description: "Thank you for your interest. Our team will review your details and contact you within 48 hours.",
      });
    }, 2000);
  };

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
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-white px-8" onClick={() => document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' })}>
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
                  title: "Register & Verify",
                  desc: "Complete your profile and upload credentials for our verification team."
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

            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div id="register-form" className="bg-background border rounded-3xl p-8 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">Professional Registration</h2>
                  <p className="text-muted-foreground">Complete your profile to join the Focus network. All fields marked with <span className="text-red-500">*</span> are mandatory.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">1</span>
                      Basic Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                        <Input id="firstName" placeholder="Dr. / Mr. / Ms." required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                        <Input id="lastName" placeholder="Surname" required />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                        <Input id="email" type="email" placeholder="doctor@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number <span className="text-red-500">*</span></Label>
                        <Input id="phone" type="tel" placeholder="+91 98765 43210" required />
                      </div>
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">2</span>
                      Professional Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Profession <span className="text-red-500">*</span></Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="psychiatrist">Psychiatrist (MD)</SelectItem>
                            <SelectItem value="psychologist">Clinical Psychologist</SelectItem>
                            <SelectItem value="counselor">Counselor / Therapist</SelectItem>
                            <SelectItem value="yoga">Yoga Therapist / Guru</SelectItem>
                            <SelectItem value="ayurveda">Ayurveda Practitioner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience <span className="text-red-500">*</span></Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0-2">0-2 Years</SelectItem>
                            <SelectItem value="3-5">3-5 Years</SelectItem>
                            <SelectItem value="5-10">5-10 Years</SelectItem>
                            <SelectItem value="10+">10+ Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license">Medical Registration / License Number <span className="text-red-500">*</span></Label>
                      <Input id="license" placeholder="e.g., MCI-12345" required />
                      <p className="text-xs text-muted-foreground">This will be verified against the national registry.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specializations (Comma separated)</Label>
                      <Input id="specialization" placeholder="e.g., Anxiety, Depression, Trauma, Cognitive Behavioral Therapy" />
                    </div>
                  </div>

                  {/* Clinic Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">3</span>
                      Practice Details
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="clinicName">Clinic / Hospital Name</Label>
                      <Input id="clinicName" placeholder="Where do you currently practice?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio</Label>
                      <Textarea id="bio" placeholder="Tell us about your approach to mental health..." className="min-h-[100px]" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" required />
                      <Label htmlFor="terms" className="text-sm font-normal">
                        I agree to the <a href="#" className="text-primary underline">Partner Terms & Conditions</a> and certify that my credentials are valid.
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg rounded-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting Application..." : "Submit Application"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
