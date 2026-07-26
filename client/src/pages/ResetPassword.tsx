import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      toast.success("Password reset. Please log in with your new password.");
      setTimeout(() => setLocation("/login"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Couldn't reset your password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-[420px] space-y-8">
          <Link href="/login">
            <Button variant="ghost" className="gap-2 -ml-4">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Button>
          </Link>

          {success ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-2xl font-serif font-bold">Password reset</h1>
              <p className="text-muted-foreground">Redirecting you to login...</p>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4 py-8">
              <h1 className="text-2xl font-serif font-bold">Invalid link</h1>
              <p className="text-muted-foreground">This password reset link is missing its token.</p>
              <Link href="/forgot-password">
                <Button className="rounded-full">Request a new link</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">Set a new password</h1>
                <p className="text-muted-foreground">At least 10 characters, with a mix of letters, numbers, or symbols.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      className="h-12 rounded-xl pr-11"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-muted-foreground/60 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    className="h-12 rounded-xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-12 rounded-full font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
