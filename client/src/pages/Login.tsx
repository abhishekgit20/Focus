import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/PageTransition";
import { Eye, EyeOff, Facebook, Mail, Chrome, ArrowLeft, Loader2, Shield } from "lucide-react";
import { login } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import heroBg from "@assets/generated_images/therapist_and_client_session.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Check for OAuth errors in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'google_not_configured') {
      toast.error("Google login is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.");
    } else if (error === 'google_auth_failed') {
      toast.error("Google authentication failed. Please try again or use email and password.");
    } else if (error === 'role_mismatch') {
      const expected = urlParams.get('expected');
      const actual = urlParams.get('actual');
      toast.error(
        `Invalid role for this login. This account is registered as a ${actual}. Please use the ${actual === 'professional' ? 'professional' : 'client'} login page.`
      );
    }
    // Clean up URL
    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const expectedRole = isProfessional ? 'professional' : 'client';
      const response = await login(email, password, expectedRole);
      
      // Validate role matches expected role (double-check on frontend)
      if (response.user.role !== expectedRole) {
        setIsLoading(false);
        toast.error(
          `Invalid role for this login. This account is registered as a ${response.user.role}. Please use the ${response.user.role === 'professional' ? 'professional' : 'client'} login page.`
        );
        return;
      }
      
      // Invalidate auth query to refetch user data from server
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.dispatchEvent(new Event('auth-change'));
      
      toast.success(`Welcome back, ${response.user.fullName}!`);
      
      // Use window.location.href for a full page reload to ensure session is properly established
      // This prevents race conditions where Profile page checks auth before session is ready
      let redirectPath = "/profile";
      if (response.user.role === 'admin') {
        redirectPath = "/admin/feedback";
      } else if (response.user.role === 'professional') {
        redirectPath = "/professional-dashboard";
      }
      
      // Small delay to ensure toast is visible and session cookie is set
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    } catch (error: any) {
      // Handle role mismatch error specifically
      if (error.message?.includes('Invalid role') || error.message?.includes('role for this login')) {
        toast.error(error.message || "Invalid role for this login. Please use the correct login page.");
      } else {
        toast.error(error.message || "Login failed. Please check your credentials.");
      }
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

        {/* Right Side - Login Form */}
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
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight">Welcome Back</h1>
              </div>
              <p className="text-base text-muted-foreground">Sign in to continue your journey.</p>
            </div>
            
            <div className="bg-muted/30 p-1 rounded-xl flex">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isProfessional ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsProfessional(false)}
              >
                Client Login
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isProfessional ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setIsProfessional(true)}
              >
                Professional Login
              </button>
            </div>

            {isProfessional && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex gap-3">
                <Shield className="w-5 h-5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold mb-1">Strict Patient Privacy Policy</p>
                  <p className="text-xs opacity-90">By logging in, you agree to adhere to HIPAA & DISHA guidelines regarding patient confidentiality and data security.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-11 h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
                </div>
                <div className="relative group">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-4 pr-11 h-12 rounded-xl bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary text-base transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox id="remember" className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground font-normal cursor-pointer select-none">Remember me for 30 days</Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-12 px-0 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/40 transition-all gap-2 text-sm font-medium text-muted-foreground"
                onClick={() => {
                  // Redirect to Google OAuth with expected role - server will handle configuration check
                  const expectedRole = isProfessional ? 'professional' : 'client';
                  window.location.href = `/api/auth/google?role=${expectedRole}`;
                }}
                data-testid="button-google-login"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button 
                variant="outline" 
                className="h-12 px-0 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/40 transition-all gap-2 text-sm font-medium text-muted-foreground"
                onClick={() => {
                  // Apple Sign In requires client-side implementation
                  // For now, show a message that it needs to be configured
                  if (typeof window !== 'undefined' && (window as any).AppleID) {
                    // Apple Sign In is available
                    (window as any).AppleID.auth.signIn({
                      requestedScopes: ['email', 'name'],
                      usePopup: true,
                    }).then((response: any) => {
                      // Redirect to backend callback
                      window.location.href = `/api/auth/apple?id_token=${response.id_token}&user=${encodeURIComponent(JSON.stringify(response.user || {}))}`;
                    }).catch((error: any) => {
                      console.error("Apple Sign In error:", error);
                      toast.error("Apple Sign In failed. Please try again.");
                    });
                  } else {
                    toast.info("Apple Sign In requires additional configuration. Please use email and password for now.");
                  }
                }}
                data-testid="button-apple-login"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-muted/30 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Don't have an account?</p>
              <Link href="/register">
                <Button variant="outline" className="w-full h-11 rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary font-semibold transition-all shadow-sm">
                  Create account in Focus
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
