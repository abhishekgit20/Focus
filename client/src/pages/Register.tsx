import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/PageTransition";
import { Eye, EyeOff, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { register } from "@/lib/api";
import { getSafeRedirect } from "@/lib/roleRouting";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import heroBg from "@assets/generated_images/therapist_and_client_session.png";

// Mirrors server/security/passwordPolicy.ts's real requirements (minus the
// common-password blocklist, which stays server-only rather than duplicated
// here) — the client used to only require 6 characters while the server
// actually required 10 + variety, so a user could fill out the entire form
// and only learn the real rule after submitting.
function checkPasswordStrength(password: string, email: string): { valid: boolean; reason?: string } {
  if (password.length < 10) {
    return { valid: false, reason: "Password must be at least 10 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, reason: "Password is too long" };
  }
  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (varietyCount < 3) {
    return { valid: false, reason: "Password must include at least 3 of: lowercase letters, uppercase letters, numbers, symbols" };
  }
  const localPart = email.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length > 3 && password.toLowerCase().includes(localPart)) {
    return { valid: false, reason: "Password must not contain your email address" };
  }
  return { valid: true };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

    const strength = checkPasswordStrength(formData.password, formData.email);
    if (!strength.valid) {
      toast.error(strength.reason!);
      setIsLoading(false);
      return;
    }

    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy to continue");
      setIsLoading(false);
      return;
    }

    try {
      // Every public signup creates a 'client' account. Professionals join
      // through the Apply as a Professional review flow after signing up —
      // there is no self-service way to register directly as professional,
      // admin, or super_admin.
      const response = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.dispatchEvent(new Event('auth-change'));

      toast.success(`Welcome to Focus, ${response.user.fullName}!`);

      // If registration was reached via ProtectedRoute bouncing an
      // unauthenticated visitor off a page like /apply-professional, send
      // them back there instead of the default profile page -- every public
      // signup is a 'client' account anyway, so it's always a valid target.
      const requestedRedirect = getSafeRedirect(new URLSearchParams(window.location.search).get("redirect"));
      setLocation(requestedRedirect || "/profile");
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
                    minLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">At least 10 characters, with 3 of: uppercase, lowercase, numbers, symbols</p>
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
                    minLength={10}
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

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agreedToTerms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agreedToTerms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>,
                  including how crisis/safety signals are handled.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-300"
                disabled={isLoading || !agreedToTerms}
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
              <Link href={`/login${window.location.search}`}>
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



