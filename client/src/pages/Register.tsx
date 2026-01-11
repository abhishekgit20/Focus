import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/PageTransition";
import { Eye, EyeOff, Mail, ArrowLeft, Loader2, Shield } from "lucide-react";
import { register } from "@/lib/api";
import { toast } from "sonner";
import heroBg from "@assets/generated_images/therapist_and_client_session.png";

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: isProfessional ? "professional" : "client",
      });

      // Store auth state in localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', response.user.role);
      localStorage.setItem('userName', response.user.fullName);
      localStorage.setItem('userEmail', response.user.email);
      window.dispatchEvent(new Event('auth-change'));

      toast.success(`Welcome to Focus, ${response.user.fullName}!`);

      // Redirect based on role
      setLocation(response.user.role === 'professional' ? "/professional-dashboard" : "/profile");
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Side - Image & Quote */}
        <div className="hidden lg:block relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-slate-900/60 z-10" />
          <img 
            src={heroBg} 
            alt="Meditation" 
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-20 bg-gradient-to-t from-slate-900 to-transparent pt-32">
            <blockquote className="text-3xl font-serif font-medium leading-relaxed mb-6">
              "The peace of God is with them whose mind and soul are in harmony, who are free from desire and wrath, who know their own soul."
            </blockquote>
            <cite className="text-lg text-white/80 not-italic block">— Bhagavad Gita, Chapter 5</cite>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="flex flex-col justify-center p-8 bg-background relative min-h-screen lg:min-h-0 pt-8 lg:py-32">
          <div className="lg:absolute lg:top-8 lg:left-8 mb-8 lg:mb-0">
            <Link href="/">
              <Button variant="ghost" className="gap-2 hover:bg-muted/50 rounded-full pl-0 lg:pl-4">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Button>
            </Link>
          </div>

          <div className="w-full max-w-[420px] mx-auto space-y-8">
            <div className="text-left space-y-2">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight">Create Account</h1>
              </div>
              <p className="text-base text-muted-foreground">Join Focus and start your wellness journey.</p>
            </div>
            
            <div className="bg-muted/30 p-1 rounded-xl flex">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isProfessional ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsProfessional(false)}
                type="button"
              >
                Client Signup
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isProfessional ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsProfessional(true)}
                type="button"
              >
                Professional Signup
              </button>
            </div>

            {isProfessional && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex gap-3">
                <Shield className="w-5 h-5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold mb-1">Strict Patient Privacy Policy</p>
                  <p className="text-xs opacity-90">By registering, you agree to adhere to HIPAA & DISHA guidelines regarding patient confidentiality and data security.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-foreground/80">Full Name</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  placeholder="Enter your full name" 
                  className="h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-11 h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                <div className="relative group">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-4 pr-11 h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">Confirm Password</Label>
                <div className="relative group">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-4 pr-11 h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-muted/30 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Already have an account?</p>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11 rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary font-semibold transition-all shadow-sm">
                  Sign In to Focus
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}



