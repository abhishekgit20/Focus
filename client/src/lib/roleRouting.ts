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
