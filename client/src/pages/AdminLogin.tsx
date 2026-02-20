import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/PageTransition";
import { Eye, EyeOff, ArrowLeft, Loader2, Shield, Lock } from "lucide-react";
import { login } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import heroBg from "@assets/generated_images/therapist_and_client_session.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await login(email, password);
      
      // Check if user is admin
      if (response.user.role !== 'admin') {
        toast.error("Access Denied", {
          description: "This is an admin-only area. Please use the regular login page.",
        });
        setIsLoading(false);
        return;
      }
      
      // Invalidate auth query to refetch user data from server
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.dispatchEvent(new Event('auth-change'));
      
      toast.success(`Welcome, ${response.user.fullName}!`);
      
      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = "/admin/feedback";
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please check your credentials.");
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
            alt="Admin Access" 
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-20 bg-gradient-to-t from-slate-900 to-transparent pt-32">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">Admin Portal</h2>
            </div>
            <blockquote className="text-xl font-serif font-medium leading-relaxed mb-6">
              "Secure access to manage and moderate the Focus platform."
            </blockquote>
            <p className="text-sm text-white/80">
              Authorized personnel only. All access is logged and monitored.
            </p>
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
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight">Admin Login</h1>
                  <p className="text-sm text-muted-foreground">Restricted Access</p>
                </div>
              </div>
              <p className="text-base text-muted-foreground">Sign in to access the admin dashboard.</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Input 
                    id="admin-email"
                    type="email" 
                    placeholder="admin@focus.com" 
                    className="h-12 rounded-xl pl-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-sm font-medium">Password</Label>
                  <Link href="/login" className="text-sm text-primary hover:underline">
                    Regular Login
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="admin-password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    className="h-12 rounded-xl pl-11 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-admin" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="remember-admin" className="text-sm font-normal cursor-pointer">
                  Remember me for 30 days
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign in to Admin Portal
                  </>
                )}
              </Button>
            </form>

            <div className="text-center space-y-2 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <Shield className="w-3 h-3 inline mr-1" />
                This is a secure admin area. Unauthorized access is prohibited.
              </p>
              <p className="text-sm text-muted-foreground">
                Not an admin?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Go to regular login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}



