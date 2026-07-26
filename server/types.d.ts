import "express-session";

declare module "express-session" {
  interface SessionData {
    // Set after password verification succeeds for an MFA-enabled account,
    // cleared once the second factor is verified or expires.
    mfaPendingUserId?: string;
    mfaPendingExpiry?: number;
    // Carries the "Remember me" choice from the first factor through to the
    // second, since the cookie's persistence is only actually set once
    // req.logIn() succeeds — which for an MFA account happens at
    // /api/auth/mfa/verify-login, not the initial /api/auth/login call.
    mfaPendingRememberMe?: boolean;
    // Set after a logged-in user re-confirms their TOTP/backup code for a
    // sensitive action (e.g. a high-value wallet top-up) — a short-lived
    // "sudo mode" so they aren't re-prompted on every single action within
    // the window. See requireStepUpMfa in routes.ts.
    mfaStepUpVerifiedAt?: number;
  }
}
