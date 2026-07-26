import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      // Always shown, whether or not the email is registered — the backend
      // deliberately doesn't reveal which emails have accounts.
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
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

          {submitted ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-2xl font-serif font-bold">Check your email</h1>
              <p className="text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. The link expires in 1 hour.
              </p>
              <Link href="/login">
                <Button variant="outline" className="rounded-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">Forgot your password?</h1>
                <p className="text-muted-foreground">Enter your email and we'll send you a link to reset it.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-11 h-12 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-full font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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
