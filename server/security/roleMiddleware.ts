import type { User } from "@shared/schema";

// Pure authorization-decision logic — deliberately has zero dependency on
// the DB, session store, or passport config, so it can be unit tested (and
// reasoned about) in isolation from everything else auth.ts wires up.

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please log in" });
}

// Alias for compatibility with existing code
export const isAuthenticated = requireAuth;

// Role middlewares below all distinguish 401 (not logged in at all) from 403
// (logged in, but as the wrong role) — a frontend route guard or API
// consumer needs that distinction to know whether to redirect to /login or
// show a "not authorized" state.
export function requireRole(allowedRoles: string[], forbiddenMessage: string) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    if (!allowedRoles.includes((req.user as User).role)) {
      return res.status(403).json({ error: forbiddenMessage });
    }
    next();
  };
}

// Middleware to check if user has professional role
export const requireProfessional = requireRole(['professional'], "Forbidden - Professional access required");

// Middleware to check if user has client role
export const requireClient = requireRole(['client'], "Forbidden - Client access required");

// Middleware to check if user has admin role. super_admin is treated as a
// superset of admin — anything an admin can do, a super_admin can too.
export const requireAdmin = requireRole(['admin', 'super_admin'], "Forbidden - Admin access required");

// Middleware for actions reserved for super_admin only (admin is NOT enough).
export const requireSuperAdmin = requireRole(['super_admin'], "Forbidden - Super admin access required");
