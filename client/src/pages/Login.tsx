import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/PageTransition";
import { Eye, EyeOff, Facebook, Mail, Chrome, ArrowLeft, Loader2 } from "lucide-react";
import heroBg from "@assets/generated_images/yoga_guru_teaching_meditation_with_counselor_present.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login delay
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      window.dispatchEvent(new Event('auth-change'));
      setIsLoading(false);
      setLocation("/profile");
    }, 1500);
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
        <div className="flex flex-col justify-center p-8 bg-background relative min-h-screen lg:min-h-0">
          <div className="absolute top-8 left-8">
            <Link href="/">
              <Button variant="ghost" className="gap-2 hover:bg-muted/50 rounded-full">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Button>
            </Link>
          </div>

          <div className="w-full max-w-[420px] mx-auto space-y-8 mt-16 lg:mt-0">
            <div className="text-left space-y-2">
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">Welcome Back</h1>
              <p className="text-base text-muted-foreground">Sign in to continue your journey to wellness.</p>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/40 transition-all gap-2 text-base font-medium text-muted-foreground">
                <Chrome className="w-5 h-5" /> Google
              </Button>
              <Button variant="outline" className="h-12 rounded-xl border-muted-foreground/20 hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/40 transition-all gap-2 text-base font-medium text-muted-foreground">
                <Facebook className="w-5 h-5 text-blue-600" /> Facebook
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <a href="#" className="font-semibold text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4">Sign up for free</a>
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
