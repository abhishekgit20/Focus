import { describe, it, expect } from "vitest";
import { getDashboardPath } from "./roleRouting";

// One test per role covers the "role-based login redirect (x4 roles)"
// requirement at the routing-decision level. The actual navigation is a
// window.location.href assignment in Login.tsx, which isn't unit-testable
// without a DOM/browser test environment — this locks down the mapping it
// depends on instead.
describe("getDashboardPath", () => {
  it("routes 'client' to /profile", () => {
    expect(getDashboardPath("client")).toBe("/profile");
  });

  it("routes 'professional' to /professional-dashboard", () => {
    expect(getDashboardPath("professional")).toBe("/professional-dashboard");
  });

  it("routes 'admin' to /admin/feedback", () => {
    expect(getDashboardPath("admin")).toBe("/admin/feedback");
  });

  it("routes 'super_admin' to /admin/feedback (reuses admin surfaces)", () => {
    expect(getDashboardPath("super_admin")).toBe("/admin/feedback");
  });

  it("falls back to /profile for an unrecognized role rather than throwing", () => {
    expect(getDashboardPath("something_unexpected")).toBe("/profile");
  });
});
