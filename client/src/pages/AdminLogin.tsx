import { useEffect } from "react";
import { useLocation } from "wouter";

// There is no separate admin login page anymore — every role signs in
// through the same form at /login and the server redirects by role. This
// route is kept only because a few admin pages still redirect here on a
// 401/403; it just forwards straight through.
export default function AdminLogin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);

  return null;
}
