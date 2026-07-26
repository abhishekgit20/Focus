import { describe, it, expect, vi } from "vitest";
import {
  requireAuth,
  requireProfessional,
  requireClient,
  requireAdmin,
  requireSuperAdmin,
} from "../security/roleMiddleware";

function mockReqRes(opts: { authenticated: boolean; role?: string }) {
  const req: any = {
    isAuthenticated: () => opts.authenticated,
    user: opts.authenticated ? { role: opts.role } : undefined,
  };
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res: any = { status };
  const next = vi.fn();
  return { req, res, next, status, json };
}

describe("requireAuth: 401 when unauthenticated, pass-through when authenticated", () => {
  it("returns 401 and does not call next() when not authenticated", () => {
    const { req, res, next, status } = mockReqRes({ authenticated: false });
    requireAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when authenticated, regardless of role", () => {
    const { req, res, next } = mockReqRes({ authenticated: true, role: "client" });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// Every role-scoped middleware must distinguish "not logged in" (401) from
// "logged in as the wrong role" (403) — a frontend route guard needs that
// distinction to know whether to redirect to /login or to the user's own
// dashboard. This was a real pre-existing bug: these middlewares used to
// return 403 even for anonymous requests.
describe.each([
  { name: "requireProfessional", middleware: requireProfessional, allowedRole: "professional" },
  { name: "requireClient", middleware: requireClient, allowedRole: "client" },
  { name: "requireAdmin", middleware: requireAdmin, allowedRole: "admin" },
  { name: "requireSuperAdmin", middleware: requireSuperAdmin, allowedRole: "super_admin" },
])("$name", ({ middleware, allowedRole }) => {
  it("returns 401 (not 403) for an unauthenticated request", () => {
    const { req, res, next, status } = mockReqRes({ authenticated: false });
    middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated as an unrelated role", () => {
    const { req, res, next, status } = mockReqRes({ authenticated: true, role: "some_other_role" });
    middleware(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it(`calls next() when authenticated as '${allowedRole}'`, () => {
    const { req, res, next } = mockReqRes({ authenticated: true, role: allowedRole });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("requireAdmin treats super_admin as a superset of admin", () => {
  it("allows a super_admin through", () => {
    const { req, res, next } = mockReqRes({ authenticated: true, role: "super_admin" });
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("requireSuperAdmin does NOT allow plain admin", () => {
  it("rejects a plain admin with 403", () => {
    const { req, res, next, status } = mockReqRes({ authenticated: true, role: "admin" });
    requireSuperAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
