import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getDashboardPath } from "@/lib/roleRouting";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  /** If set, only these roles may view this route. Anyone else authenticated
   * gets bounced to their own dashboard rather than seeing the page. */
  allowedRoles?: string[];
}

/**
 * Wraps a page so it redirects to /login if unauthenticated, and — when
 * allowedRoles is given — redirects an authenticated-but-wrong-role user to
 * their own dashboard instead of rendering. Role is always read from the
 * server-verified session (useAuth), never trusted from the client.
 */
export function ProtectedRoute({ children, redirectTo = "/login", allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const isForbidden = isAuthenticated && !!user && !!allowedRoles && !allowedRoles.includes(user.role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation(redirectTo);
      return;
    }
    if (isForbidden && user) {
      setLocation(getDashboardPath(user.role));
    }
  }, [isLoading, isAuthenticated, isForbidden, user, setLocation, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || isForbidden) {
    return null;
  }

  return <>{children}</>;
}
