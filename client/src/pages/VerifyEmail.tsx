import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/api";

export default function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    verifyEmailToken(token)
      .then(() => setStatus("success"))
      .catch((error: any) => {
        setStatus("error");
        setMessage(error.message || "This verification link is invalid or has expired.");
      });
  }, [token]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-background text-center">
        <div className="w-full max-w-[420px] space-y-4">
          {status === "pending" && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h1 className="text-2xl font-serif font-bold">Verifying your email...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-2xl font-serif font-bold">Email verified</h1>
              <p className="text-muted-foreground">Your email address has been confirmed.</p>
              <Link href="/login">
                <Button className="rounded-full mt-2">Continue to Login</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="text-2xl font-serif font-bold">Verification failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <Link href="/login">
                <Button variant="outline" className="rounded-full mt-2">Back to Login</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
