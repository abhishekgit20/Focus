// Single source of truth for "where does this role land after login /
// when it hits a route it's not allowed on". Keeps Login.tsx and
// ProtectedRoute from disagreeing about a role's home page.
export function getDashboardPath(role: string): string {
  switch (role) {
    case "professional":
      return "/professional-dashboard";
    case "admin":
    case "super_admin":
      return "/admin/feedback";
    case "client":
    default:
      return "/profile";
  }
}

// Validates a `?redirect=` param before ever handing it to setLocation/
// window.location.href — must be a same-origin relative path, never an
// absolute URL (http://..., //evil.com) an attacker could smuggle into a
// login/register link to redirect a user off-site after auth.
export function getSafeRedirect(param: string | null): string | null {
  if (!param) return null;
  if (!param.startsWith("/") || param.startsWith("//")) return null;
  if (param.includes("://")) return null;
  return param;
}
