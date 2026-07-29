import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, sanitizeUser } from "./storage";
import { requireAuth, requireClient, requireProfessional, requireAdmin } from "./auth";
import passport from "passport";
import { generateChatResponse, generateJournalInsights, analyzeMood } from "./ai";
import { detectCrisisSignal, buildCrisisExcerpt, CRISIS_RESPONSE_TEXT } from "./crisisDetection";
import {
  sendCrisisAlertEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedAlertEmail,
  sendNewDeviceAlertEmail,
  sendProfessionalApplicationApprovedEmail,
  sendProfessionalApplicationRejectedEmail,
  sendProfessionalSuspendedEmail,
  sendInvoiceEmail,
} from "./emailService";
import {
  documentUpload,
  validateAndStoreDocument,
  getDocumentStream,
  DOCUMENT_TYPES,
  FileValidationError,
  type DocumentType,
} from "./security/fileUpload";
import { hashPassword, verifyPassword } from "./security/passwordHashing";
import { checkPasswordStrength } from "./security/passwordPolicy";
import { generateSecureToken, hashToken } from "./security/tokens";
import { logSecurityEvent } from "./security/events";
import { fingerprintRequest, recordDeviceAndCheckIfNew } from "./security/devices";
import { invalidateAllUserSessions } from "./security/sessions";
import { isHoneypotTriggered, isSubmittedSuspiciouslyFast, verifyCaptcha } from "./security/botProtection";
import {
  generateTotpSecret,
  encryptTotpSecret,
  getEnrollmentQrCode,
  verifyTotpTokenOnce,
  generateBackupCodes,
  verifyBackupCode,
} from "./security/mfa";
import {
  insertUserSchema,
  insertProfessionalProfileSchema,
  updateProfessionalProfileSchema,
  insertSessionSchema,
  insertJournalEntrySchema,
  insertChatMessageSchema,
  insertReviewSchema,
  insertFeedbackSchema,
  insertDailyCheckInSchema,
  insertMicroPracticeSchema,
  insertCommunityChallengeSchema,
  insertChallengeParticipantSchema,
  insertVoiceMessageSchema,
  insertProfessionalApplicationSchema,
  insertProfessionalAvailabilitySchema,
  insertProfessionalLeaveSchema,
  type User,
} from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { getRazorpayClient, getRazorpayKeyId, verifyPaymentSignature } from "./razorpayClient";
import { testConnection } from "./db";
import { authLimiter, signupLimiter, oauthLimiter, aiLimiter, paymentLimiter, apiLimiter, passwordResetLimiter, mfaLimiter } from "./rateLimiter";
import { db } from "./db";
import { paymentOrders, refunds as refundsTable, payments as paymentsTable, bookingPayments as bookingPaymentsTable, sessions as sessionsTable } from "@shared/schema";
import { eq, and, gte, desc, sql as sqlOp } from "drizzle-orm";
import { broadcastToRoom } from "./realtime";
import { getIceServers } from "./webrtcIce";
import * as money from "./lib/money";
import { getPgErrorCode } from "./lib/dbErrors";
import { computePricing, decomposeLockedPrice, OfferingNotFoundError } from "./pricing";
import { computeBreakdownFromBase } from "./lib/pricingMath";
import { getAvailableSlots } from "./booking/availability";
import { getOrCreateInvoice, renderInvoicePdf } from "./booking/invoice";
import { notifyIfInstantSessionNowPending } from "./booking/notifications";
import { bookingPaymentIdempotencyKey } from "./lib/idempotency";
import {
  reserveSlot,
  payFullyFromWallet,
  initiateGatewayPayment,
  verifyAndCapturePayment,
  refundBooking,
  issuePartialRefund,
  completeSessionAndPayout,
  NotFoundError as BookingNotFoundError,
  ForbiddenError as BookingForbiddenError,
  InvalidStateError,
  SlotConflictError,
  InsufficientBalanceError,
  BookingUnavailableError,
  InvalidSignatureError,
} from "./booking/paymentEngine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== PUBLIC CONFIG ====================

  // Lets the frontend show a "coming soon" state for features gated on a
  // secret that isn't set yet (e.g. the AI companion before OPENAI_API_KEY
  // is configured in production), instead of letting users interact with a
  // chat UI that quietly returns a canned "not configured" message. Never
  // expose the actual secrets here -- booleans only.
  app.get("/api/config", (_req, res) => {
    res.json({
      aiCompanionEnabled: !!process.env.OPENAI_API_KEY?.trim(),
    });
  });

  // ==================== AUTH ROUTES ====================

  // Get current user (returns null if not authenticated - for frontend to check auth status)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json(null);
      }
      res.json(sanitizeUser(req.user as User));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register new user (for email/password registration)
  app.post("/api/auth/register", signupLimiter, async (req, res, next) => {
    try {
      const { email, password, fullName } = req.body;

      // Bot protection: a hidden field real users never fill, plus a
      // suspiciously-fast submit. Both fail silently with a fake success so
      // scripted signups can't tell they were caught and adapt.
      if (isHoneypotTriggered(req.body) || isSubmittedSuspiciouslyFast(req.body.formRenderedAt)) {
        await logSecurityEvent({ type: "abuse.honeypot_triggered", req, metadata: { endpoint: "register" } });
        return res.json({ user: { id: "pending", email, role: "client", fullName } });
      }
      if (!(await verifyCaptcha(req.body.captchaToken))) {
        return res.status(400).json({ error: "Captcha verification failed" });
      }

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: "Email, password and full name are required" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      // Password validation
      const strength = checkPasswordStrength(password, email);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason });
      }

      // Quick database connection check
      const isConnected = await testConnection().catch(() => false);
      if (!isConnected) {
        return res.status(503).json({ 
          error: "Database unavailable",
          message: "The database is currently unavailable. Please try again in a few moments."
        });
      }
      
      // Check if user exists with retry logic
      let existingUser;
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          existingUser = await storage.getUserByEmail(email);
          break; // Success, exit retry loop
        } catch (dbError: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Database connection error after retries:", dbError);
            return res.status(503).json({ 
              error: "Database connection issue",
              message: "Unable to connect to the database. Please try again in a moment or contact support if the problem persists."
            });
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await hashPassword(password);
      const emailVerificationToken = generateSecureToken();

      // Create user with retry logic
      let user;
      retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          // SECURITY: role used to come straight from the request body
          // (`role || 'client'`), so `POST /api/auth/register` with
          // `{ role: "admin" }` created an admin account with zero
          // verification. Every public registration is now unconditionally
          // a 'client' — there is no self-service path to 'professional',
          // 'admin', or 'super_admin'. Professionals go through the
          // Apply-as-Professional review flow below; admin accounts are
          // provisioned out-of-band (server/createAdmin.ts).
          user = await storage.createUser({
            email,
            password: hashedPassword,
            fullName,
            role: 'client',
            emailVerificationTokenHash: hashToken(emailVerificationToken),
            emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
          break; // Success, exit retry loop
        } catch (dbError: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Database connection error creating user:", dbError);
            return res.status(503).json({ 
              error: "Database connection issue",
              message: "Unable to create account due to database connection issue. Please try again in a moment."
            });
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!user) {
        return res.status(500).json({ error: "Failed to create user account" });
      }

      await storage.addPasswordHistory(user.id, hashedPassword);
      sendVerificationEmail(email, emailVerificationToken).catch((err) =>
        console.error("Failed to send verification email:", err)
      );

      // Create wallet for client with retry logic
      if (user.role === 'client') {
        retryCount = 0;
        while (retryCount < maxRetries) {
          try {
            await storage.createWallet({ userId: user.id, balance: "0", totalRecharged: "0" });
            break;
          } catch (dbError: any) {
            retryCount++;
            if (retryCount >= maxRetries) {
              console.error("Failed to create wallet, but user was created:", dbError);
              // Don't fail registration if wallet creation fails - user can still use the app
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
      }
      
      
      // Establish a real session, same as /api/auth/login — previously this
      // just returned success with no req.logIn/session.regenerate, so the
      // client's follow-up /api/auth/user check came back 401 and bounced
      // the brand-new user straight to /login, making every signup look
      // broken even though the account was created correctly.
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.logIn(user!, (loginErr) => {
          if (loginErr) return next(loginErr);

          res.json({
            success: true,
            user: {
              id: user!.id,
              email: user!.email,
              role: user!.role,
              fullName: user!.fullName,
              profileCompleted: !!user!.fullName,
            },
          });
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }

      // Check for database connection errors
      if (error.message?.includes('timeout') || error.message?.includes('Connection terminated') || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: "Database connection issue",
          message: "Unable to connect to the database. Please check your internet connection and try again. If the problem persists, the database server may be temporarily unavailable."
        });
      }

      // Generic error
      return res.status(500).json({ 
        error: "Registration failed",
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : "An error occurred during registration. Please try again."
      });
    }
  });

  // Login user (for email/password login)
  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    // One login endpoint for every role. The client never declares who it
    // expects to be logging in as — role is looked up from the DB after
    // password verification and the frontend redirects based on what the
    // server tells it, never the other way around.
    passport.authenticate('local', async (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        await logSecurityEvent({ type: "auth.login_failure", req, metadata: { email: req.body?.email, locked: !!info?.locked } });
        // SECURITY: always the same status + message regardless of why the
        // login failed (no such user, wrong password, or account locked) —
        // a distinct 423/lockout response is an account-enumeration oracle.
        // `locked` is still recorded above for admin-facing audit logging.
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // "Remember me" was previously a checkbox that did nothing — every
      // session got the same fixed 30-day cookie regardless. Unchecking it
      // now actually makes the cookie a browser-session cookie (no Max-Age/
      // Expires), so it's gone once the browser closes.
      const rememberMe = req.body?.rememberMe !== false;

      // MFA challenge: password was correct, but we don't log the user in
      // yet. The session holds only a short-lived pending marker until the
      // second factor is verified at /api/auth/mfa/verify-login.
      if (user.mfaEnabled) {
        req.session.mfaPendingUserId = user.id;
        req.session.mfaPendingExpiry = Date.now() + 5 * 60 * 1000;
        req.session.mfaPendingRememberMe = rememberMe;
        return res.json({ mfaRequired: true });
      }

      // Regenerate the session ID on login (session-fixation protection):
      // an attacker who fixed a session ID before login must not inherit an
      // authenticated session after it.
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.logIn(user, async (loginErr) => {
          if (loginErr) return next(loginErr);
          if (!rememberMe) {
            // @types/express-session types `expires` as Date | null, but the
            // package's own doc comment confirms `false` is the documented
            // way to make this a browser-session cookie (no Max-Age/Expires
            // sent at all, so it's gone once the browser closes).
            (req.session.cookie as unknown as { expires: Date | null | false }).expires = false;
          }

          const fingerprint = fingerprintRequest(req);
          const isNewDevice = await recordDeviceAndCheckIfNew(user.id, fingerprint);
          if (isNewDevice) {
            sendNewDeviceAlertEmail(user.email!, { ipAddress: req.ip, userAgent: req.get("user-agent") }).catch(() => {});
            logSecurityEvent({ type: "auth.new_device_login", userId: user.id, req });
          }
          logSecurityEvent({ type: "auth.login_success", userId: user.id, req });

          return res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              fullName: user.fullName,
              profileImage: user.profileImage,
              mfaEnabled: user.mfaEnabled,
              emailVerified: user.emailVerified,
              profileCompleted: !!user.fullName,
            },
          });
        });
      });
    })(req, res, next);
  });

  // Second factor of login, once /api/auth/login responded { mfaRequired: true }
  app.post("/api/auth/mfa/verify-login", mfaLimiter, async (req, res, next) => {
    try {
      const pendingUserId = req.session.mfaPendingUserId;
      const expiry = req.session.mfaPendingExpiry;
      if (!pendingUserId || !expiry || Date.now() > expiry) {
        delete req.session.mfaPendingUserId;
        delete req.session.mfaPendingExpiry;
        return res.status(401).json({ error: "MFA session expired. Please log in again." });
      }

      const user = await storage.getUser(pendingUserId);
      if (!user || !user.mfaEnabled) {
        return res.status(401).json({ error: "MFA session invalid. Please log in again." });
      }

      const { token, backupCode } = req.body;
      let verified = false;

      if (token && user.mfaSecretEncrypted) {
        const result = verifyTotpTokenOnce(token, user.mfaSecretEncrypted, user.mfaLastUsedStep);
        verified = result.valid;
        if (verified) {
          await storage.updateUser(user.id, { mfaLastUsedStep: result.step });
        }
      } else if (backupCode && user.mfaBackupCodeHashes) {
        const result = await verifyBackupCode(backupCode, user.mfaBackupCodeHashes);
        verified = result.valid;
        if (verified) {
          await storage.updateUser(user.id, { mfaBackupCodeHashes: result.remainingHashes });
        }
      }

      if (!verified) {
        await logSecurityEvent({ type: "auth.mfa_challenge_failure", userId: user.id, req });
        return res.status(401).json({ error: "Invalid verification code" });
      }

      const rememberMe = req.session.mfaPendingRememberMe !== false;
      delete req.session.mfaPendingUserId;
      delete req.session.mfaPendingExpiry;
      delete req.session.mfaPendingRememberMe;

      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.logIn(user, async (loginErr) => {
          if (loginErr) return next(loginErr);
          if (!rememberMe) {
            // @types/express-session types `expires` as Date | null, but the
            // package's own doc comment confirms `false` is the documented
            // way to make this a browser-session cookie (no Max-Age/Expires
            // sent at all, so it's gone once the browser closes).
            (req.session.cookie as unknown as { expires: Date | null | false }).expires = false;
          }

          const fingerprint = fingerprintRequest(req);
          const isNewDevice = await recordDeviceAndCheckIfNew(user.id, fingerprint);
          if (isNewDevice) {
            sendNewDeviceAlertEmail(user.email!, { ipAddress: req.ip, userAgent: req.get("user-agent") }).catch(() => {});
            logSecurityEvent({ type: "auth.new_device_login", userId: user.id, req });
          }
          logSecurityEvent({ type: "auth.login_success", userId: user.id, req, metadata: { mfa: true } });

          return res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              fullName: user.fullName,
              profileImage: user.profileImage,
              mfaEnabled: user.mfaEnabled,
              emailVerified: user.emailVerified,
              profileCompleted: !!user.fullName,
            },
          });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // Google OAuth routes
  app.get("/api/auth/google", oauthLimiter, (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn("Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
      return res.redirect("/login?error=google_not_configured");
    }

    try {
      passport.authenticate("google", {
        scope: ["profile", "email"],
      })(req, res, next);
    } catch (error: any) {
      console.error("Google OAuth authentication error:", error);
      if (error.message?.includes('Unknown authentication strategy') || error.message?.includes('google')) {
        return res.redirect("/login?error=google_not_configured");
      }
      return res.redirect("/login?error=google_auth_failed");
    }
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect("/login?error=google_not_configured");
      }
      passport.authenticate("google", { failureRedirect: "/login?error=google_auth_failed" })(req, res, next);
    },
    async (req: any, res) => {
      try {
        const user = req.user as User;
        if (!user) {
          return res.redirect("/login?error=google_auth_failed");
        }

        // The frontend reads the authenticated user's role from
        // /api/auth/me after this redirect and routes to the matching
        // dashboard — the server never negotiates role via query params.
        res.redirect("/?oauth_success=true");
      } catch (error) {
        console.error("Google callback error:", error);
        res.redirect("/login?error=google_auth_failed");
      }
    }
  );

  // Logout user
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        // Clear the session cookie
        res.clearCookie("connect.sid", { path: "/" });
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  
  // Get current user (legacy endpoint)
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          profileImage: user.profileImage,
          mfaEnabled: user.mfaEnabled,
          emailVerified: user.emailVerified,
          profileCompleted: !!user.fullName,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==================== ACCOUNT SECURITY ROUTES ====================

  // Email verification
  app.post("/api/auth/verify-email", passwordResetLimiter, async (req, res, next) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required" });

      const user = await storage.getUserByEmailVerificationTokenHash(hashToken(token));
      if (!user || !user.emailVerificationExpiry || user.emailVerificationExpiry.getTime() < Date.now()) {
        return res.status(400).json({ error: "This verification link is invalid or has expired" });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiry: null,
      });
      await logSecurityEvent({ type: "auth.email_verified", userId: user.id, req });

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/resend-verification", passwordResetLimiter, requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      if (user.emailVerified) {
        return res.json({ message: "Email is already verified" });
      }
      const token = generateSecureToken();
      await storage.updateUser(user.id, {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await sendVerificationEmail(user.email!, token);
      res.json({ message: "Verification email sent" });
    } catch (error) {
      next(error);
    }
  });

  // Password reset request — always responds the same way whether or not the
  // email is registered, so this endpoint can't be used to enumerate accounts.
  app.post("/api/auth/forgot-password", passwordResetLimiter, async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const generic = { message: "If an account exists for that email, a password reset link has been sent." };

      if (isHoneypotTriggered(req.body) || isSubmittedSuspiciouslyFast(req.body.formRenderedAt)) {
        await logSecurityEvent({ type: "abuse.honeypot_triggered", req, metadata: { endpoint: "forgot-password" } });
        return res.json(generic);
      }

      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = generateSecureToken();
        await storage.updateUser(user.id, {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        await sendPasswordResetEmail(email, token);
        await logSecurityEvent({ type: "auth.password_reset_requested", userId: user.id, req });
      }

      res.json(generic);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      const user = await storage.getUserByPasswordResetTokenHash(hashToken(token));
      if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.getTime() < Date.now()) {
        return res.status(400).json({ error: "This reset link is invalid or has expired" });
      }

      const strength = checkPasswordStrength(newPassword, user.email || undefined);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason });
      }

      const recentHashes = await storage.getRecentPasswordHashes(user.id);
      for (const oldHash of recentHashes) {
        if (await verifyPassword(newPassword, oldHash)) {
          return res.status(400).json({ error: "You've used this password recently. Please choose a different one." });
        }
      }

      const newHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        password: newHash,
        passwordResetTokenHash: null,
        passwordResetExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastPasswordChangeAt: new Date(),
      });
      await storage.addPasswordHistory(user.id, newHash);
      await invalidateAllUserSessions(user.id);
      await logSecurityEvent({ type: "auth.password_reset_completed", userId: user.id, req });
      sendPasswordChangedAlertEmail(user.email!).catch(() => {});

      res.json({ message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
      next(error);
    }
  });

  // Change password while logged in
  app.post("/api/auth/change-password", requireAuth, passwordResetLimiter, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      const user = await storage.getUser(authUser.id);
      if (!user?.password || !(await verifyPassword(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const strength = checkPasswordStrength(newPassword, user.email || undefined);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason });
      }

      const recentHashes = await storage.getRecentPasswordHashes(user.id);
      for (const oldHash of recentHashes) {
        if (await verifyPassword(newPassword, oldHash)) {
          return res.status(400).json({ error: "You've used this password recently. Please choose a different one." });
        }
      }

      const newHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: newHash, lastPasswordChangeAt: new Date() });
      await storage.addPasswordHistory(user.id, newHash);

      // Every other session for this account is invalidated — only the one
      // that just made this change stays logged in.
      await invalidateAllUserSessions(user.id, req.sessionID);
      await logSecurityEvent({ type: "auth.password_changed", userId: user.id, req });
      sendPasswordChangedAlertEmail(user.email!).catch(() => {});

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout-all-devices", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      await invalidateAllUserSessions(user.id, req.sessionID);
      await logSecurityEvent({ type: "auth.logout_all_devices", userId: user.id, req });
      res.json({ message: "Logged out of all other devices" });
    } catch (error) {
      next(error);
    }
  });

  // ---- MFA (TOTP) ----

  app.post("/api/auth/mfa/enroll", requireAuth, mfaLimiter, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const user = await storage.getUser(authUser.id);
      if (user?.mfaEnabled) {
        return res.status(400).json({ error: "MFA is already enabled" });
      }

      const secret = generateTotpSecret();
      const qrCode = await getEnrollmentQrCode(user!.email || user!.id, secret);
      await storage.updateUser(authUser.id, { mfaSecretEncrypted: encryptTotpSecret(secret) });

      res.json({ qrCode, secret });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/mfa/enroll/confirm", requireAuth, mfaLimiter, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const user = await storage.getUser(authUser.id);
      if (!user?.mfaSecretEncrypted) {
        return res.status(400).json({ error: "Start enrollment first" });
      }

      const { token } = req.body;
      const tokenCheck = token ? verifyTotpTokenOnce(token, user.mfaSecretEncrypted, user.mfaLastUsedStep) : { valid: false, step: null };
      if (!tokenCheck.valid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      const { codes, hashes } = await generateBackupCodes();
      await storage.updateUser(authUser.id, { mfaEnabled: true, mfaBackupCodeHashes: hashes, mfaLastUsedStep: tokenCheck.step });
      await logSecurityEvent({ type: "auth.mfa_enabled", userId: authUser.id, req });

      // Shown once — the user is expected to save these; only hashes are kept.
      res.json({ message: "MFA enabled", backupCodes: codes });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/mfa/disable", requireAuth, mfaLimiter, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const user = await storage.getUser(authUser.id);
      const { currentPassword } = req.body;

      if (!user?.password || !currentPassword || !(await verifyPassword(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is required to disable MFA" });
      }

      await storage.updateUser(authUser.id, { mfaEnabled: false, mfaSecretEncrypted: null, mfaBackupCodeHashes: null });
      await logSecurityEvent({ type: "auth.mfa_disabled", userId: authUser.id, req });

      res.json({ message: "MFA disabled" });
    } catch (error) {
      next(error);
    }
  });

  // "Sudo mode" for a sensitive action while already logged in (e.g. a
  // high-value wallet top-up — see requireStepUpMfa/HIGH_VALUE_THRESHOLD
  // below). Re-checks a TOTP/backup code without re-authenticating the
  // whole session; success is remembered for STEP_UP_VALID_MS so the user
  // isn't re-prompted on every single qualifying action.
  const STEP_UP_VALID_MS = 10 * 60 * 1000;
  const HIGH_VALUE_WALLET_TOPUP_THRESHOLD = 5000; // rupees — covers the "Super Saver"/"Mega Pack" recharge tiers

  app.post("/api/auth/mfa/step-up", requireAuth, mfaLimiter, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const user = await storage.getUser(authUser.id);
      if (!user?.mfaEnabled) {
        return res.status(400).json({ error: "MFA is not enabled on this account" });
      }

      const { token, backupCode } = req.body;
      let verified = false;

      if (token && user.mfaSecretEncrypted) {
        const result = verifyTotpTokenOnce(token, user.mfaSecretEncrypted, user.mfaLastUsedStep);
        verified = result.valid;
        if (verified) {
          await storage.updateUser(user.id, { mfaLastUsedStep: result.step });
        }
      } else if (backupCode && user.mfaBackupCodeHashes) {
        const result = await verifyBackupCode(backupCode, user.mfaBackupCodeHashes);
        verified = result.valid;
        if (verified) {
          await storage.updateUser(user.id, { mfaBackupCodeHashes: result.remainingHashes });
        }
      }

      if (!verified) {
        await logSecurityEvent({ type: "auth.mfa_challenge_failure", userId: user.id, req });
        return res.status(401).json({ error: "Invalid verification code" });
      }

      req.session.mfaStepUpVerifiedAt = Date.now();
      res.json({ verified: true });
    } catch (error) {
      next(error);
    }
  });

  // Guards a sensitive, already-authenticated action behind a recent
  // step-up (see /api/auth/mfa/step-up above). Only enforced for accounts
  // that have MFA enabled — there's no second factor to step up with
  // otherwise, so this is a defense-in-depth layer on top of (not a
  // replacement for) the existing password + session + rate-limit controls.
  async function requireStepUpMfa(req: any, res: any): Promise<boolean> {
    const user = req.user as User;
    const account = await storage.getUser(user.id);
    if (!account?.mfaEnabled) return true;
    const verifiedAt = req.session.mfaStepUpVerifiedAt;
    if (verifiedAt && Date.now() - verifiedAt < STEP_UP_VALID_MS) return true;
    res.status(428).json({ error: "mfa_step_up_required", message: "Please verify your identity to continue with this amount." });
    return false;
  }

  // ---- Privacy: data export & account deletion ----

  app.get("/api/account/export", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = await storage.exportUserData(user.id);
      res.setHeader("Content-Disposition", `attachment; filename="focus-account-data.json"`);
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/account/delete", requireAuth, async (req, res, next) => {
    try {
      const authUser = req.user as User;
      const user = await storage.getUser(authUser.id);
      const { currentPassword } = req.body;

      // OAuth-only accounts have no password to check — being logged in is
      // sufficient proof of ownership in that case.
      if (user?.password && !(currentPassword && (await verifyPassword(currentPassword, user.password)))) {
        return res.status(401).json({ error: "Current password is required to delete your account" });
      }

      // anonymizeUser() scrubs the account but deliberately doesn't touch
      // wallets — there's no automated payout path, so silently proceeding
      // would forfeit real money with no way back. Block instead of guessing
      // at a refund/forfeiture policy that isn't this endpoint's to decide.
      const wallet = await storage.getWallet(authUser.id);
      if (wallet && Number(wallet.balance) > 0) {
        return res.status(409).json({
          error: `You have ₹${wallet.balance} in your wallet. Please use it or contact focus.abhix@gmail.com before deleting your account.`,
        });
      }

      await storage.anonymizeUser(authUser.id);
      await invalidateAllUserSessions(authUser.id);
      await logSecurityEvent({ type: "admin.action", userId: authUser.id, req, metadata: { action: "self_account_deletion" } });

      req.logout(() => {
        req.session.destroy(() => {
          res.clearCookie("connect.sid", { path: "/" });
          res.json({ message: "Account deleted" });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== NOTIFICATIONS ====================

  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const notifications = await storage.getUserNotifications(user.id);
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      await storage.markNotificationRead(req.params.id, user.id);
      res.json({ message: "Marked as read" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      await storage.markAllNotificationsRead(user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== APPLY AS PROFESSIONAL ====================
  // The ONLY path to the 'professional' role. Registration always creates a
  // 'client'; this application + admin review is what changes that.

  const REQUIRED_DOCUMENT_TYPES: DocumentType[] = ["government_id", "professional_license"];

  app.post(
    "/api/professional-applications",
    requireClient,
    documentUpload.any(),
    async (req, res, next) => {
      try {
        const user = req.user as User;

        if (await storage.hasPendingOrApprovedApplication(user.id)) {
          return res.status(409).json({ error: "You already have a pending or approved application" });
        }

        const files = (req.files as Express.Multer.File[]) || [];
        const submittedTypes = new Set(files.map((f) => f.fieldname));
        const missing = REQUIRED_DOCUMENT_TYPES.filter((t) => !submittedTypes.has(t));
        if (missing.length > 0) {
          return res.status(400).json({ error: `Missing required document(s): ${missing.join(", ")}` });
        }

        let languages: string[];
        try {
          languages = req.body.languages ? JSON.parse(req.body.languages) : ["English"];
        } catch {
          return res.status(400).json({ error: "languages must be a JSON array" });
        }

        // pricePerMinute is deliberately not collected here — professionals
        // configure real per-type/per-duration pricing in Session Settings
        // after approval, via professionalSessionOfferings.
        const parsedBody = insertProfessionalApplicationSchema.parse({
          specialization: req.body.specialization,
          qualification: req.body.qualification,
          experience: Number(req.body.experience),
          bio: req.body.bio || undefined,
          languages,
          licenseNumber: req.body.licenseNumber || undefined,
        });

        // Validate every file's real content (magic bytes) before storing
        // any of them — an application should never end up half-saved with
        // some documents on disk and others rejected.
        const documents = [];
        for (const file of files) {
          if (!DOCUMENT_TYPES.includes(file.fieldname as DocumentType)) {
            return res.status(400).json({ error: `Unknown document field: ${file.fieldname}` });
          }
          documents.push(await validateAndStoreDocument(file, file.fieldname as DocumentType));
        }

        const application = await storage.createProfessionalApplication({
          ...parsedBody,
          userId: user.id,
          documents,
        });

        await logSecurityEvent({
          type: "admin.professional_application_submitted",
          userId: user.id,
          req,
          metadata: { applicationId: application.id },
        });

        res.json({ application });
      } catch (error) {
        if (error instanceof FileValidationError) {
          return res.status(400).json({ error: error.message });
        }
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Invalid input", details: error.errors });
        }
        next(error);
      }
    }
  );

  app.get("/api/professional-applications/mine", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const application = await storage.getUserLatestApplication(user.id);
      res.json({ application: application || null });
    } catch (error) {
      next(error);
    }
  });

  // Document download — ownership or admin only. Never served statically.
  app.get("/api/professional-applications/:id/documents/:storageKey", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const application = await storage.getProfessionalApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isOwner = application.userId === user.id;
      const isAdmin = user.role === "admin" || user.role === "super_admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You don't have access to this document" });
      }

      const doc = (application.documents as any[]).find((d) => d.storageKey === req.params.storageKey);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      const { stream, contentLength } = await getDocumentStream(doc.storageKey);
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
      if (contentLength) res.setHeader("Content-Length", String(contentLength));
      stream.pipe(res);
    } catch (error) {
      if (error instanceof FileValidationError) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  // ==================== ADMIN: PROFESSIONAL APPLICATIONS & MANAGEMENT ====================

  app.get("/api/admin/professional-applications", requireAdmin, async (req, res, next) => {
    try {
      const status = (req.query.status as string) || "pending";
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }
      const applications = await storage.getApplicationsByStatus(status as "pending" | "approved" | "rejected");
      res.json({ applications });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/professional-applications/:id", requireAdmin, async (req, res, next) => {
    try {
      const application = await storage.getProfessionalApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      res.json({ application });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/professional-applications/:id/approve", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const application = await storage.approveProfessionalApplication(req.params.id, admin.id);
      const applicant = await storage.getUser(application.userId);

      await logSecurityEvent({
        type: "admin.professional_application_approved",
        userId: admin.id,
        req,
        metadata: { applicationId: application.id, applicantId: application.userId },
      });

      await storage.createNotification({
        userId: application.userId,
        type: "professional_application_approved",
        title: "You're approved as a professional!",
        body: "Your application has been approved. Your profile is now live.",
      });

      if (applicant?.email) {
        sendProfessionalApplicationApprovedEmail(applicant.email, applicant.fullName || "there").catch(() => {});
      }

      res.json({ application });
    } catch (error: any) {
      if (error.message === "Application not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Application has already been reviewed") {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  });

  app.post("/api/admin/professional-applications/:id/reject", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ error: "A rejection reason is required" });
      }

      const application = await storage.rejectProfessionalApplication(req.params.id, admin.id, reason.trim());
      const applicant = await storage.getUser(application.userId);

      await logSecurityEvent({
        type: "admin.professional_application_rejected",
        userId: admin.id,
        req,
        metadata: { applicationId: application.id, applicantId: application.userId },
      });

      await storage.createNotification({
        userId: application.userId,
        type: "professional_application_rejected",
        title: "Update on your professional application",
        body: reason.trim(),
      });

      if (applicant?.email) {
        sendProfessionalApplicationRejectedEmail(applicant.email, applicant.fullName || "there", reason.trim()).catch(() => {});
      }

      res.json({ application });
    } catch (error: any) {
      if (error.message === "Application not found") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Application has already been reviewed") {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  });

  app.post("/api/admin/professionals/:userId/suspend", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ error: "A suspension reason is required" });
      }

      const targetUserId = req.params.userId;
      await storage.suspendProfessional(targetUserId, reason.trim());
      await invalidateAllUserSessions(targetUserId);

      await logSecurityEvent({
        type: "admin.professional_suspended",
        userId: admin.id,
        req,
        metadata: { targetUserId },
      });

      await storage.createNotification({
        userId: targetUserId,
        type: "professional_suspended",
        title: "Your professional account has been suspended",
        body: reason.trim(),
      });

      const target = await storage.getUser(targetUserId);
      if (target?.email) {
        sendProfessionalSuspendedEmail(target.email, target.fullName || "there", reason.trim()).catch(() => {});
      }

      res.json({ message: "Professional suspended" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/professionals/:userId/reactivate", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const targetUserId = req.params.userId;
      await storage.reactivateProfessional(targetUserId);

      await logSecurityEvent({
        type: "admin.professional_reactivated",
        userId: admin.id,
        req,
        metadata: { targetUserId },
      });

      await storage.createNotification({
        userId: targetUserId,
        type: "professional_reactivated",
        title: "Your professional account has been reactivated",
        body: "You're visible to clients again.",
      });

      res.json({ message: "Professional reactivated" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== PROFESSIONAL ROUTES ====================

  // Get all available professionals
  app.get("/api/professionals", async (req, res, next) => {
    try {
      const professionals = await storage.getAllProfessionals();
      res.json({ professionals });
    } catch (error) {
      next(error);
    }
  });
  
  // Get professional profile
  app.get("/api/professionals/:userId", async (req, res, next) => {
    try {
      const profile = await storage.getProfessionalProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ error: "Professional not found" });
      }
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });
  
  // Get current professional's profile
  app.get("/api/professional/profile", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const profile = await storage.getProfessionalProfile(user.id);
      if (!profile) {
        return res.status(404).json({ error: "Professional profile not found" });
      }
      res.json({ profile, user: sanitizeUser(user) });
    } catch (error) {
      next(error);
    }
  });

  // Update current professional's editable profile fields (Settings)
  app.patch("/api/professional/profile", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = updateProfessionalProfileSchema.parse(req.body);
      const profile = await storage.updateProfessionalProfile(user.id, data);
      res.json({ profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });

  // Update professional online/offline status
  app.patch("/api/professionals/availability", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { isOnline } = req.body;
      if (isOnline && !(await storage.professionalHasAnyEnabledOffering(user.id))) {
        return res.status(400).json({ error: "Configure at least one session price in Session Settings before going online" });
      }
      await storage.updateProfessionalAvailability(user.id, isOnline);
      res.json({ message: "Availability updated" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== SESSION TEMPLATES & PRICING ====================

  // Fixed duration catalog — public, used by both the professional config UI
  // and the client booking flow.
  app.get("/api/session-templates", async (req, res, next) => {
    try {
      const templates = await storage.getSessionTemplates();
      res.json({ templates });
    } catch (error) {
      next(error);
    }
  });

  // A professional's own pricing grid (all rows, enabled or not).
  app.get("/api/professional/session-offerings", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const offerings = await storage.getProfessionalOfferings(user.id);
      res.json({ offerings });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/professional/session-offerings", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { consultationType, sessionTemplateId, price, enabled } = req.body;
      if (!["chat", "audio", "video"].includes(consultationType)) {
        return res.status(400).json({ error: "Invalid consultation type" });
      }
      const template = await storage.getSessionTemplate(sessionTemplateId);
      if (!template) {
        return res.status(400).json({ error: "Invalid session template" });
      }
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return res.status(400).json({ error: "Price must be a positive number" });
      }
      const offering = await storage.upsertProfessionalOffering({
        professionalId: user.id,
        consultationType,
        sessionTemplateId,
        price: priceNum.toFixed(2),
        enabled: enabled !== false,
      });
      res.json({ offering });
    } catch (error) {
      next(error);
    }
  });

  // Public: what a professional currently offers (enabled only), for the booking modal.
  app.get("/api/professionals/:userId/offerings", async (req, res, next) => {
    try {
      const all = await storage.getProfessionalOfferings(req.params.userId);
      // BUG FIX (price mismatch between booking and call-time charge): this
      // used to return each offering's raw `price` only -- the professional's
      // base rate before GST -- and the client displayed that number
      // throughout the entire booking flow (template selection, "Pay ₹X"
      // button, wallet-sufficiency checks) as if it were the final amount.
      // reserveSlot() has always locked session.priceAtBooking as the
      // GST-inclusive total (see server/pricing.ts's computePricing), so the
      // client was shown a lower number than what actually got charged/
      // debited moments later -- exactly the reported "shown ₹200, charged
      // ₹236" bug. totalPrice here is computed via the same
      // computeBreakdownFromBase() the backend uses to set priceAtBooking,
      // so this is the true final amount, not a second independent formula
      // that could drift from it. `price` (the base rate) is kept for the
      // professional's own Session Settings page, which edits that raw
      // value -- only the public, client-facing response gains this field.
      const offerings = all
        .filter((o) => o.enabled)
        .map((o) => ({ ...o, totalPrice: computeBreakdownFromBase(o.price).total }));
      res.json({ offerings });
    } catch (error) {
      next(error);
    }
  });

  // Public: free scheduled-session slots for a given date + template.
  app.get("/api/professionals/:userId/availability-slots", async (req, res, next) => {
    try {
      const { date, sessionTemplateId } = req.query;
      if (!date || !sessionTemplateId) {
        return res.status(400).json({ error: "date and sessionTemplateId are required" });
      }
      const template = await storage.getSessionTemplate(sessionTemplateId as string);
      if (!template) {
        return res.status(400).json({ error: "Invalid session template" });
      }
      // A plain YYYY-MM-DD calendar date, not a timezone-bearing instant —
      // see server/booking/availability.ts for why that distinction matters.
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
      }
      const slots = await getAvailableSlots(req.params.userId, date, template.durationMinutes);
      res.json({ slots });
    } catch (error) {
      next(error);
    }
  });

  // ==================== PROFESSIONAL WORKING HOURS & LEAVE ====================

  app.get("/api/professional/working-hours", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const hours = await storage.getProfessionalAvailability(user.id);
      res.json({ hours });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/professional/working-hours", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertProfessionalAvailabilitySchema.parse({ ...req.body, professionalId: user.id });
      if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
        return res.status(400).json({ error: "dayOfWeek must be 0-6" });
      }
      const row = await storage.setProfessionalAvailability(data);
      res.json({ hours: row });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/professional/working-hours/:dayOfWeek", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const dayOfWeek = Number(req.params.dayOfWeek);
      await storage.deleteProfessionalAvailability(user.id, dayOfWeek);
      res.json({ message: "Working hours removed" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/professional/leave", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const leave = await storage.getProfessionalLeave(user.id);
      res.json({ leave });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/professional/leave", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertProfessionalLeaveSchema.parse({ ...req.body, professionalId: user.id });
      if (new Date(data.endDate) < new Date(data.startDate)) {
        return res.status(400).json({ error: "endDate must be on or after startDate" });
      }

      // A professional could previously block out a date range that already
      // had paid, confirmed bookings in it — the booking stayed untouched
      // (still shown as scheduled to the client) while the professional
      // just wouldn't be there, with nothing to cancel/refund/notify anyone.
      const conflicts = await storage.getConflictingSessions(user.id, new Date(data.startDate), new Date(data.endDate));
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: `You have ${conflicts.length} booked session${conflicts.length > 1 ? "s" : ""} in this date range. Cancel or reschedule ${conflicts.length > 1 ? "them" : "it"} first.`,
          conflictingSessions: conflicts.map((s) => ({ id: s.id, scheduledAt: s.scheduledAt })),
        });
      }

      const row = await storage.createProfessionalLeave(data);
      res.json({ leave: row });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/professional/leave/:id", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      await storage.deleteProfessionalLeave(req.params.id, user.id);
      res.json({ message: "Leave removed" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== WALLET ROUTES ====================
  
  // Get user wallet
  app.get("/api/wallet", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const wallet = await storage.getWallet(user.id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      res.json({ wallet });
    } catch (error) {
      next(error);
    }
  });
  
  // Get wallet transactions
  app.get("/api/wallet/transactions", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const wallet = await storage.getWallet(user.id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      const transactions = await storage.getWalletTransactions(wallet.id);
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });
  
  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res, next) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      next(error);
    }
  });

  // Create Stripe checkout session for wallet recharge
  app.post("/api/wallet/checkout", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { amount, packName, idempotencyKey } = req.body;
      const userId = user.id;
      
      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Minimum recharge amount is ₹100" });
      }
      if (amount >= HIGH_VALUE_WALLET_TOPUP_THRESHOLD && !(await requireStepUpMfa(req, res))) return;

      const existingWallet = await storage.getWallet(userId);
      if (!existingWallet) {
        await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      
      // Use idempotency key if provided, otherwise generate one
      const idempotency = idempotencyKey || `wallet_${userId}_${Date.now()}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: {
              name: packName || `Wallet Recharge - ₹${amount}`,
              description: `Add ₹${amount} to your Focus wallet`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        // session_id lets the wallet page confirm the payment actually
        // landed (see /api/wallet/checkout-session-status) instead of
        // trusting the redirect alone — Stripe sends the browser back here
        // as soon as Checkout completes, which can race ahead of the
        // webhook that actually credits the wallet.
        success_url: `${baseUrl}/wallet?success=true&amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/wallet?canceled=true`,
        metadata: {
          userId,
          amount: amount.toString(),
          type: 'wallet_recharge',
          idempotencyKey: idempotency,
        },
      }, {
        idempotencyKey: idempotency, // Stripe idempotency key
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Stripe checkout error:', error);
      next(error);
    }
  });

  // Lets the wallet page confirm what actually happened to a Checkout
  // session instead of trusting success_url's redirect alone — Stripe sends
  // the browser back as soon as Checkout completes, which can race ahead of
  // (or, if the webhook silently fails, never be followed by) the webhook
  // that actually credits the wallet. The page polls this briefly after
  // redirect rather than declaring success from a URL query param.
  app.get("/api/wallet/checkout-session-status", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const sessionId = req.query.session_id;
      if (typeof sessionId !== "string" || !sessionId) {
        return res.status(400).json({ error: "session_id is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.userId !== user.id) {
        return res.status(403).json({ error: "This checkout session does not belong to you" });
      }

      if (session.payment_status !== "paid") {
        return res.json({ status: "not_paid" });
      }

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      const credited = paymentIntentId ? await storage.getWalletTransactionByStripePaymentId(paymentIntentId) : undefined;
      if (credited) {
        return res.json({ status: "credited", wallet: await storage.getWallet(user.id) });
      }
      // Stripe confirms payment succeeded but our webhook hasn't credited
      // the wallet yet — real (webhook delivery lag), not a failure. The
      // caller should poll again shortly rather than treat this as an error.
      return res.json({ status: "paid_pending_credit" });
    } catch (error) {
      next(error);
    }
  });

  // Simulate wallet recharge — local development only. This credits a
  // wallet with no real payment behind it, so it must never be reachable in
  // production; it was previously live with no such guard, letting any
  // authenticated client mint unlimited wallet balance for free. Real
  // recharges go through /api/wallet/checkout (Stripe) or
  // /api/wallet/razorpay-order + /api/wallet/razorpay-verify, both of which
  // verify an actual payment before crediting anything.
  app.post("/api/wallet/recharge", requireClient, async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ error: "Not found" });
      }

      const user = req.user as any;
      const { amount } = req.body;
      // BUG FIX: this was `user.dbUser?.id || user.claims?.sub`, a shape
      // from a different (unused) auth strategy — passport's actual
      // req.user here is the raw users row, so that always evaluated to
      // undefined. Every route using it was silently scoping queries to
      // "WHERE x = NULL" (matches nothing) instead of throwing, so it read
      // as "no data yet" rather than a bug. Affected: Razorpay recharge
      // order creation and verification, and wallet recharge.
      const userId = user.id;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      const existingWallet = await storage.getWallet(userId);
      if (!existingWallet) {
        await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
      }

      // BUG FIX (pre-deploy verification pass): this used to read the
      // wallet with a plain SELECT then overwrite the balance with
      // `parseFloat(wallet.balance) + parseFloat(amount)` — an unlocked
      // read-modify-write using float math, the exact anti-pattern the rest
      // of this hardening pass removed from every real money path (see the
      // note on /api/wallet/razorpay-verify above). A concurrent request
      // against the same wallet (double-click, or a real recharge/refund
      // landing at the same moment) could lose an update. There's no real
      // gateway payment behind a dev-simulated recharge to dedupe on, so a
      // fresh random ID stands in for one — this still runs through the
      // same FOR UPDATE-locked, decimal-money-math path
      // (creditWalletForGatewayPayment) every real recharge uses.
      const result = await storage.creditWalletForGatewayPayment({
        userId,
        amount: Number(amount).toFixed(2),
        description: `Simulated wallet recharge of ₹${amount} (dev only)`,
        razorpayPaymentId: `dev_sim_${crypto.randomUUID()}`,
      });

      res.json({ wallet: result.wallet });
    } catch (error) {
      next(error);
    }
  });

  // ==================== RAZORPAY (UPI) ROUTES ====================

  // Get Razorpay config (key ID for frontend)
  app.get("/api/razorpay/config", async (req, res, next) => {
    try {
      const keyId = getRazorpayKeyId();
      res.json({ keyId });
    } catch (error) {
      res.status(500).json({ error: "Razorpay not configured" });
    }
  });

  // Create Razorpay order for UPI payment
  app.post("/api/wallet/razorpay-order", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { amount, packName } = req.body;
      const userId = user.id; // see bug-fix note above /api/wallet/recharge

      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Minimum recharge amount is ₹100" });
      }
      if (amount >= HIGH_VALUE_WALLET_TOPUP_THRESHOLD && !(await requireStepUpMfa(req, res))) return;

      const existingWallet = await storage.getWallet(userId);
      if (!existingWallet) {
        await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
      }

      // Check for existing pending order to prevent duplicate charges
      const existingOrders = await db
        .select()
        .from(paymentOrders)
        .where(
          and(
            eq(paymentOrders.userId, userId),
            eq(paymentOrders.status, "pending"),
            gte(paymentOrders.createdAt, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
          )
        );
      
      if (existingOrders.length > 0) {
        return res.status(400).json({ 
          error: "A payment is already in progress. Please wait or try again in a few minutes." 
        });
      }

      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `wallet_${userId}_${Date.now()}`,
        notes: {
          userId,
          amount: amount.toString(),
          type: "wallet_recharge",
          packName: packName || `Wallet Recharge - ₹${amount}`,
        },
      });

      await storage.createPaymentOrder(order.id, userId, amount.toString());

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getRazorpayKeyId(),
      });
    } catch (error) {
      console.error("Razorpay order error:", error);
      next(error);
    }
  });

  // Verify Razorpay payment and credit wallet
  app.post("/api/wallet/razorpay-verify", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const userId = user.id; // see bug-fix note above /api/wallet/recharge

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment details" });
      }

      const paymentOrder = await storage.getPaymentOrder(razorpay_order_id);
      if (!paymentOrder) {
        return res.status(400).json({ error: "Order not found" });
      }

      if (paymentOrder.userId !== userId) {
        return res.status(403).json({ error: "Order does not belong to this user" });
      }

      if (paymentOrder.status === "completed") {
        // Not an error — this order's payment already succeeded (e.g. a
        // network blip on the first response caused the client to retry the
        // exact same verify call). Previously responded 400 here, which a
        // retried request from the client legitimately hits on every
        // successful-but-then-retried recharge, and which the wallet page
        // took as "payment failed, contact support" even though the money
        // had already landed.
        return res.json({ success: true, alreadyProcessed: true, wallet: await storage.getWallet(userId) });
      }

      const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      const completedOrder = await storage.markPaymentOrderCompleted(razorpay_order_id, razorpay_payment_id);
      if (!completedOrder) {
        return res.status(400).json({ error: "Failed to process payment - may already be completed" });
      }

      // SECURITY: this previously did storage.getWallet() (a plain SELECT)
      // then storage.updateWalletBalance() (an absolute-value overwrite) —
      // markPaymentOrderCompleted's atomic status transition prevents this
      // *same order* from being processed twice, but not a lost update if
      // some other concurrent credit to this same wallet (another recharge,
      // a refund landing at the same moment) reads the pre-credit balance
      // between this read and write. creditWalletForGatewayPayment locks
      // the wallet row for the duration of its own read-modify-write.
      const rechargeAmount = paymentOrder.amount;
      const result = await storage.creditWalletForGatewayPayment({
        userId,
        amount: rechargeAmount,
        description: `UPI wallet recharge of ₹${rechargeAmount} (Payment ID: ${razorpay_payment_id})`,
        razorpayPaymentId: razorpay_payment_id,
      });

      if (!result.credited) {
        // markPaymentOrderCompleted already guarantees this order is only
        // ever completed once, so this path means the same razorpay_payment_id
        // was already credited under a different order — treat as already-done.
        return res.json({ success: true, wallet: await storage.getWallet(userId) });
      }

      res.json({ success: true, wallet: result.wallet });
    } catch (error) {
      console.error("Razorpay verify error:", error);
      next(error);
    }
  });
  
  // ==================== BOOKING & PAYMENT ROUTES ====================
  // Replaces the old direct POST /api/sessions / POST /api/sessions/instant
  // (which created a booking with no payment step at all). Every booking now
  // goes through: reserve a priced slot -> pay (wallet / gateway / split) ->
  // instant sessions additionally require professional accept within a
  // timeout. Price, duration, and professional pricing are always
  // server-derived — the client only ever chooses which offering to buy.

  function mapBookingError(error: unknown, res: any): boolean {
    if (error instanceof OfferingNotFoundError) { res.status(400).json({ error: error.message }); return true; }
    if (error instanceof BookingNotFoundError) { res.status(404).json({ error: error.message || "Not found" }); return true; }
    if (error instanceof BookingForbiddenError) { res.status(403).json({ error: "You don't have access to this booking" }); return true; }
    if (error instanceof InvalidStateError) { res.status(409).json({ error: error.message }); return true; }
    if (error instanceof SlotConflictError) { res.status(409).json({ error: error.message }); return true; }
    if (error instanceof InsufficientBalanceError) { res.status(402).json({ error: error.message }); return true; }
    if (error instanceof BookingUnavailableError) { res.status(409).json({ error: error.message }); return true; }
    if (error instanceof InvalidSignatureError) { res.status(400).json({ error: error.message }); return true; }
    return false;
  }

  // Step 1: reserve a priced slot before any payment happens.
  app.post("/api/bookings/reserve", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { professionalId, consultationType, sessionTemplateId, mode, scheduledAt } = req.body;

      if (!professionalId || !consultationType || !sessionTemplateId || !mode) {
        return res.status(400).json({ error: "professionalId, consultationType, sessionTemplateId, and mode are required" });
      }
      if (!["chat", "audio", "video"].includes(consultationType)) {
        return res.status(400).json({ error: "Invalid consultation type" });
      }
      if (!["instant", "scheduled"].includes(mode)) {
        return res.status(400).json({ error: "mode must be 'instant' or 'scheduled'" });
      }
      if (mode === "scheduled" && !scheduledAt) {
        return res.status(400).json({ error: "scheduledAt is required for a scheduled session" });
      }

      const { session, pricing } = await reserveSlot({
        clientId: user.id,
        professionalId,
        consultationType,
        sessionTemplateId,
        mode,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      res.json({ session, pricing });
    } catch (error) {
      if (mapBookingError(error, res)) return;
      next(error);
    }
  });

  // Step 2: pay for a reserved slot. method: 'wallet' | 'gateway' | 'split'.
  app.post("/api/bookings/:sessionId/pay", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { method, idempotencyKey } = req.body;

      if (!["wallet", "gateway", "split"].includes(method)) {
        return res.status(400).json({ error: "method must be 'wallet', 'gateway', or 'split'" });
      }

      if (method === "wallet") {
        const bookingPayments = await payFullyFromWallet(req.params.sessionId, user.id);
        await logSecurityEvent({ type: "billing.session_completed", userId: user.id, req, metadata: { sessionId: req.params.sessionId, method: "wallet" } });
        await notifyIfInstantSessionNowPending(req.params.sessionId);
        return res.json({ paid: true, bookingPayments });
      }

      const key = idempotencyKey || bookingPaymentIdempotencyKey(req.params.sessionId, user.id);
      const result = await initiateGatewayPayment(req.params.sessionId, user.id, key, method === "split");

      if (result.alreadyPaid) {
        return res.json({ paid: true, bookingPayments: result.bookingPayments });
      }

      res.json({
        paid: false,
        razorpayOrderId: result.razorpayOrderId,
        gatewayAmount: result.gatewayPortion,
        walletAmount: result.walletPortion,
        keyId: result.keyId,
        currency: result.currency,
      });
    } catch (error) {
      if (mapBookingError(error, res)) return;
      next(error);
    }
  });

  // Step 3: verify the Razorpay checkout callback and capture payment.
  app.post("/api/payments/verify", requireClient, paymentLimiter, async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment verification fields" });
      }

      const result = await verifyAndCapturePayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, req);
      await logSecurityEvent({ type: "billing.session_completed", userId: (req.user as User).id, req, metadata: { razorpayOrderId: razorpay_order_id } });
      // Only notify on the delivery that actually captured the payment —
      // this checkout callback and the Razorpay payment.captured webhook
      // (server/index.ts) both race to process the same payment under
      // normal operation (not just retries). Mirrors the webhook handler's
      // own guard (result.bookingPayments?.[0]?.sessionId): a non-empty
      // bookingPayments array is the only outcome that means THIS call was
      // the one that actually captured it — both result.alreadyProcessed
      // (caught before the transaction) and the empty-array outcome (the
      // narrower race caught inside the transaction's FOR UPDATE lock) mean
      // someone else already did. This call previously notified
      // unconditionally, duplicating the professional's "new request" alert
      // whenever the webhook won either race.
      const capturedSessionId = result.bookingPayments?.[0]?.sessionId;
      if (capturedSessionId) {
        await notifyIfInstantSessionNowPending(capturedSessionId);
      }
      res.json({ paid: true, ...result });
    } catch (error) {
      if (mapBookingError(error, res)) return;
      next(error);
    }
  });

  // Client-initiated cancellation of a scheduled (not yet started) booking.
  app.post("/api/bookings/:sessionId/cancel", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Booking not found" });
      if (session.clientId !== user.id) return res.status(403).json({ error: "You don't have access to this booking" });
      if (!["scheduled", "pending", "payment_pending"].includes(session.status)) {
        return res.status(409).json({ error: "This booking can no longer be cancelled" });
      }

      const cancellationWindowHours = Number(process.env.CANCELLATION_WINDOW_HOURS ?? 2);
      const hoursUntilStart = (new Date(session.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
      if (session.mode === "scheduled" && session.status === "scheduled" && hoursUntilStart < cancellationWindowHours) {
        return res.status(409).json({ error: `Cancellations must be made at least ${cancellationWindowHours} hours before the session` });
      }

      const refunds = await refundBooking(req.params.sessionId, "client_cancelled_within_window", user.id);
      await logSecurityEvent({ type: "billing.session_completed", userId: user.id, req, metadata: { sessionId: req.params.sessionId, action: "client_cancelled" } });
      // SECURITY/HONESTY: refundBooking() can fail the actual gateway-side
      // refund call (network error, gateway outage) after the booking is
      // already cancelled — previously this response claimed "refund
      // initiated" unconditionally, so a failed refund looked identical to a
      // successful one from the client's perspective, with no retry job to
      // ever fix it.
      const anyFailed = refunds.some((r) => r.status === "failed");
      res.json({
        message: anyFailed
          ? "Booking cancelled. Your refund couldn't be processed automatically — our team has been notified and will complete it manually."
          : "Booking cancelled and refund initiated",
        refundStatus: anyFailed ? "failed" : "initiated",
      });
    } catch (error) {
      next(error);
    }
  });

  // Professional accepts or declines an instant session request. Payment was
  // already captured at request time (see "Payment capture, not
  // authorize/hold" in the design notes) — a decline or timeout triggers a
  // real refund, not a void.
  app.patch("/api/sessions/:id/respond", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { accept } = req.body;

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.professionalId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }
      if (session.status !== "pending") {
        return res.status(409).json({ error: "This request has already been responded to" });
      }
      if (session.respondBy && new Date() > new Date(session.respondBy)) {
        return res.status(409).json({ error: "This request has timed out" });
      }

      let refundStatus: "initiated" | "failed" | undefined;
      if (accept) {
        await storage.updateSessionStatus(req.params.id, "scheduled");
        broadcastToRoom(`client_${session.clientId}`, {
          type: "session_accepted",
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        // HONESTY: refundBooking()'s result was previously discarded — a
        // failed gateway refund here (network error, gateway outage) was
        // indistinguishable from a successful one to the client, with no
        // retry job to ever actually complete it. See the mirrored fix on
        // POST /api/bookings/:sessionId/cancel above.
        const refunds = await refundBooking(req.params.id, "professional_rejected", null);
        refundStatus = refunds.some((r) => r.status === "failed") ? "failed" : "initiated";
        const recommendations = await storage.getSimilarOnlineProfessionals(
          session.professionalId,
          session.type,
          session.sessionTemplateId!
        );
        broadcastToRoom(`client_${session.clientId}`, {
          type: "session_declined",
          sessionId: session.id,
          userId: user.id,
          userRole: "professional",
          recommendations,
          refundStatus,
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await storage.getSession(req.params.id);
      res.json({ session: updated, refundStatus });
    } catch (error) {
      next(error);
    }
  });

  // Get user sessions
  app.get("/api/sessions", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const sessions = await storage.getUserSessions(user.id, user.role as 'client' | 'professional');
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });
  
  // Get professional upcoming sessions
  app.get("/api/sessions/upcoming", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const sessions = await storage.getProfessionalUpcomingSessions(user.id);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  // REST fallback for pending instant-session requests — the dashboard's
  // incoming-request card previously only ever populated from a live WS
  // push, so a professional who wasn't already connected at the exact
  // moment a request came in had no way to ever see it, refresh or not.
  app.get("/api/sessions/pending-requests", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const sessions = await storage.getProfessionalPendingRequests(user.id);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  // Get session by ID
  // SECURITY: was readable by any authenticated user regardless of whether
  // they were a party to it, exposing another user's session notes,
  // schedule, and cost. Now scoped to the client or professional on it.
  app.get("/api/sessions/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.clientId !== user.id && session.professionalId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  // Persisted chat transcript for a session (server/realtime.ts writes to
  // the same table on every WS "message" frame) — lets either party see the
  // conversation again after a refresh or on reopening a completed session,
  // which previously didn't exist anywhere once the in-memory WS relay lost it.
  app.get("/api/sessions/:id/messages", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.clientId !== user.id && session.professionalId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }
      const messages = await storage.getSessionMessages(req.params.id);
      res.json({ messages });
    } catch (error) {
      next(error);
    }
  });

  // Fallback send path for when the session's WebSocket isn't open (still
  // connecting, briefly dropped, etc.) — the WS path in server/realtime.ts
  // is preferred for its lower latency, but a message typed while the
  // socket isn't OPEN previously had nowhere to go and was silently lost
  // despite the UI showing it as sent. This persists the same way and pushes
  // it live to the room for whoever is currently connected.
  app.post("/api/sessions/:id/messages", requireAuth, apiLimiter, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { content } = req.body;
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "content is required" });
      }
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const senderRole = session.clientId === user.id ? "client" : session.professionalId === user.id ? "professional" : null;
      if (!senderRole) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }

      const saved = await storage.createSessionMessage({
        sessionId: req.params.id,
        senderId: user.id,
        senderRole,
        content,
      });
      broadcastToRoom(req.params.id, {
        type: "message",
        userId: user.id,
        userRole: senderRole,
        content,
        timestamp: saved.createdAt.toISOString(),
      });
      res.json({ message: saved });
    } catch (error) {
      next(error);
    }
  });

  // The other party's public-safe info for a session (name, photo, and
  // specialization when they're the professional) — lets the client/
  // professional call screens show who they're actually talking to without
  // a general-purpose "look up any user" endpoint that would be an IDOR risk.
  // Authorization is the same session-membership check as GET /api/sessions/:id.
  app.get("/api/sessions/:id/counterpart", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.clientId !== user.id && session.professionalId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }

      const isCallerClient = session.clientId === user.id;
      const counterpartId = isCallerClient ? session.professionalId : session.clientId;

      if (isCallerClient) {
        const profile = await storage.getProfessionalProfile(counterpartId);
        if (!profile) return res.status(404).json({ error: "Professional not found" });
        return res.json({
          counterpart: {
            id: profile.user.id,
            fullName: profile.user.fullName,
            profileImage: profile.user.profileImage,
            specialization: profile.specialization,
          },
        });
      }

      const counterpart = await storage.getUser(counterpartId);
      if (!counterpart) return res.status(404).json({ error: "Client not found" });
      res.json({
        counterpart: {
          id: counterpart.id,
          fullName: counterpart.fullName,
          profileImage: counterpart.profileImage,
          specialization: null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Short-lived ICE server credentials (STUN always; TURN when configured —
  // see server/webrtcIce.ts) for the calling client to set up its
  // RTCPeerConnection. Auth-gated + rate-limited so anonymous traffic can't
  // mint TURN relay credentials against your quota; not scoped to a specific
  // session since the actual call-access boundary is enforced by the
  // authenticated WebSocket room in realtime.ts, not by who can fetch ICE config.
  app.get("/api/webrtc/ice-servers", requireAuth, apiLimiter, async (req, res, next) => {
    try {
      const iceServers = await getIceServers();
      res.json({ iceServers });
    } catch (error) {
      next(error);
    }
  });

  // Update session status
  // SECURITY / BILLING INTEGRITY: previously any authenticated user could
  // update *any* session by ID (no ownership check) and set an arbitrary
  // `totalCost` and `durationMinutes`, which were written straight into an
  // earnings record — letting any account forge payouts or tamper with
  // unrelated sessions. Now: caller must be a party to the session, status
  // is restricted to known values, and completion never recomputes cost —
  // the price was already fixed at booking time (session.priceAtBooking),
  // so completion just settles the professional's payout from that locked
  // amount minus platform commission/tax, regardless of actual elapsed time.
  const SESSION_STATUSES = ['scheduled', 'pending', 'in_progress', 'completed', 'cancelled'];

  app.patch("/api/sessions/:id/status", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { status, startTime, endTime } = req.body;

      if (typeof status !== 'string' || !SESSION_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.clientId !== user.id && session.professionalId !== user.id) {
        return res.status(403).json({ error: "You don't have access to this session" });
      }

      if (status === 'completed') {
        // SECURITY / BILLING INTEGRITY: this used to be its own "read
        // session, check status !== 'completed', then write" sequence with
        // no lock — server/realtime.ts's finalizeSessionBilling does the
        // same completion+payout independently (it fires when the WS call
        // room empties, this fires when the client's "End Session" button
        // calls this REST endpoint), and neither held a lock, so both could
        // see "not yet completed" at once and both create a payout. Confirmed
        // in production: two sessions each ended up with two identical,
        // millisecond-apart earnings rows. completeSessionAndPayout holds a
        // FOR UPDATE lock for the whole read-check-write and is now the only
        // place either path creates a payout.
        const effectiveStart = session.startTime ?? undefined;
        const effectiveEnd = new Date();
        const effectiveDuration = effectiveStart
          ? Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000))
          : 0;

        const result = await completeSessionAndPayout(req.params.id, effectiveStart, effectiveEnd, effectiveDuration);
        if (!result.alreadyCompleted) {
          await logSecurityEvent({ type: "billing.session_completed", userId: user.id, req, metadata: { sessionId: session.id, durationMinutes: effectiveDuration } });
        }
      } else {
        // Non-billing status transitions may still carry informational
        // timestamps (e.g. a booking flow setting scheduledAt-adjacent data).
        await storage.updateSessionStatus(
          req.params.id,
          status,
          startTime ? new Date(startTime) : undefined,
          endTime ? new Date(endTime) : undefined
        );
      }

      res.json({ message: "Session updated" });
    } catch (error) {
      next(error);
    }
  });
  
  // ==================== EARNINGS ROUTES ====================
  
  // Get professional earnings
  app.get("/api/earnings", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const earnings = await storage.getProfessionalEarnings(user.id);
      res.json({ earnings });
    } catch (error) {
      next(error);
    }
  });
  
  // Get today's earnings
  app.get("/api/earnings/today", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.id; // see bug-fix note above /api/wallet/recharge
      const todayEarnings = await storage.getTodayEarnings(professionalId);
      res.json({ todayEarnings });
    } catch (error) {
      next(error);
    }
  });

  // ==================== PROFESSIONAL DASHBOARD ROUTES ====================

  // Get professional dashboard stats
  app.get("/api/professional/stats", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.id; // see bug-fix note above /api/wallet/recharge
      
      const todayEarnings = await storage.getTodayEarnings(professionalId);
      const profile = await storage.getProfessionalProfile(professionalId);
      const sessions = await storage.getProfessionalUpcomingSessions(professionalId);
      const allSessions = await storage.getUserSessions(professionalId, 'professional');
      const reviews = await storage.getProfessionalReviews(professionalId);
      
      const totalSessions = allSessions.length;
      const upcomingSessions = sessions.filter(s => s.status === 'scheduled').length;
      const pendingSessions = sessions.filter(s => s.status === 'pending').length;
      
      res.json({
        todayEarnings: todayEarnings || "0",
        totalSessions,
        upcomingSessions,
        pendingSessions,
        avgRating: reviews.length > 0 ? profile?.rating : null,
        totalReviews: reviews.length,
      });
    } catch (error) {
      next(error);
    }
  });

  // Get professional's upcoming sessions with client details
  app.get("/api/professional/sessions/today", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.id; // see bug-fix note above /api/wallet/recharge
      const sessions = await storage.getProfessionalUpcomingSessions(professionalId);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  // Full session history for the Appointments and My Patients tabs
  app.get("/api/professional/sessions", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.id; // see bug-fix note above /api/wallet/recharge
      const sessions = await storage.getAllProfessionalSessions(professionalId);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  // Get professional wallet balance
  app.get("/api/professional/wallet", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.id; // see bug-fix note above /api/wallet/recharge
      const earnings = await storage.getProfessionalEarnings(professionalId);
      
      const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const pendingEarnings = earnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const availableBalance = totalEarnings - pendingEarnings;
      
      res.json({
        totalEarnings: totalEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        availableBalance: availableBalance.toFixed(2),
      });
    } catch (error) {
      next(error);
    }
  });
  
  // ==================== JOURNAL ROUTES ====================
  
  // Create journal entry with AI insights
  app.post("/api/journal", requireClient, aiLimiter, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { title, content, mood } = req.body;

      // Server-side crisis check - journaling is often where distress first surfaces in writing.
      const crisisCheck = detectCrisisSignal(content);
      if (crisisCheck.isCrisis) {
        const crisisEvent = await storage.createCrisisEvent({
          userId: user.id,
          source: "journal",
          matchedSignals: crisisCheck.matchedSignals,
          excerpt: buildCrisisExcerpt(content),
        });
        sendCrisisAlertEmail(crisisEvent).catch(() => {});
      }

      // Auto-detect mood if not provided
      const detectedMood = mood || await analyzeMood(content);

      // Create journal entry
      const entry = await storage.createJournalEntry({
        userId: user.id,
        title,
        content,
        mood: detectedMood,
        tags: req.body.tags || [],
      });

      // Generate AI insights asynchronously
      generateJournalInsights(content, detectedMood).then(async (insights) => {
        await storage.updateJournalWithAI(entry.id, insights);
      }).catch(err => console.error('Failed to generate insights:', err));

      res.json({ entry, isCrisis: crisisCheck.isCrisis, crisisSupportMessage: crisisCheck.isCrisis ? CRISIS_RESPONSE_TEXT : undefined });
    } catch (error) {
      next(error);
    }
  });
  
  // Get user journal entries
  app.get("/api/journal", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const entries = await storage.getUserJournalEntries(user.id);
      res.json({ entries });
    } catch (error) {
      next(error);
    }
  });
  
  // ==================== CHAT ROUTES ====================
  
  // Send chat message and get AI response
  app.post("/api/chat", requireClient, aiLimiter, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { message, conversationId } = req.body;

      // Save user message
      await storage.createChatMessage({
        userId: user.id,
        conversationId,
        role: 'user',
        content: message,
      });

      // Server-side crisis check - authoritative, unlike any client-side keyword check.
      const crisisCheck = detectCrisisSignal(message);
      if (crisisCheck.isCrisis) {
        const crisisEvent = await storage.createCrisisEvent({
          userId: user.id,
          source: "chat",
          conversationId,
          matchedSignals: crisisCheck.matchedSignals,
          excerpt: buildCrisisExcerpt(message),
        });
        sendCrisisAlertEmail(crisisEvent).catch(() => {});

        // Skip the LLM call - always return the deterministic safety response.
        const aiMessage = await storage.createChatMessage({
          userId: user.id,
          conversationId,
          role: 'assistant',
          content: CRISIS_RESPONSE_TEXT,
        });

        return res.json({ message: aiMessage, isCrisis: true });
      }

      // Get conversation history
      const history = await storage.getConversationMessages(user.id, conversationId);
      const conversationHistory = history.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Generate AI response
      const { response, bhagavadGitaReference } = await generateChatResponse(message, conversationHistory);

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        userId: user.id,
        conversationId,
        role: 'assistant',
        content: response,
        bhagavadGitaReference,
      });

      res.json({ message: aiMessage });
    } catch (error) {
      next(error);
    }
  });
  
  // Get conversation messages
  app.get("/api/chat/:conversationId", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const messages = await storage.getConversationMessages(user.id, req.params.conversationId);
      res.json({ messages });
    } catch (error) {
      next(error);
    }
  });
  
  // ==================== REVIEW ROUTES ====================
  
  // Create review
  // SECURITY: previously trusted clientId/professionalId straight from the
  // request body, so any client could post a review AS another client, or
  // review a professional they never had a session with (fake review
  // spam that directly inflates/deflates that professional's rating, since
  // createReview recomputes it). Now the reviewer, the professional, and
  // the rating eligibility are all derived from a session the caller
  // actually owns — never from client-supplied identifiers.
  app.post("/api/reviews", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { sessionId, rating, comment } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const session = await storage.getSession(sessionId);
      if (!session || session.clientId !== user.id) {
        return res.status(403).json({ error: "You can only review a session you were a client in" });
      }
      if (session.status !== "completed") {
        return res.status(400).json({ error: "You can only review a completed session" });
      }

      const existing = await storage.getReviewBySessionId(sessionId);
      if (existing) {
        return res.status(409).json({ error: "This session has already been reviewed" });
      }

      const data = insertReviewSchema.parse({
        sessionId,
        rating,
        comment,
        clientId: user.id,
        professionalId: session.professionalId,
      });
      const review = await storage.createReview(data);
      res.json({ review });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });
  
  // Get professional reviews
  app.get("/api/reviews/:professionalId", async (req, res, next) => {
    try {
      const reviews = await storage.getProfessionalReviews(req.params.professionalId);
      res.json({ reviews });
    } catch (error) {
      next(error);
    }
  });

  // ==================== PARTNER INQUIRY (NO AUTH REQUIRED) ====================
  
  app.post("/api/partner-inquiry", async (req, res, next) => {
    try {
      const {
        organizationName,
        contactPerson,
        email,
        phone,
        organizationType,
        partnershipInterests,
        message,
      } = req.body;

      // Basic validation
      if (!organizationName || !contactPerson || !email || !phone || !organizationType) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Please fill in all required fields",
        });
      }

      if (!Array.isArray(partnershipInterests) || partnershipInterests.length === 0) {
        return res.status(400).json({
          error: "Partnership interests required",
          message: "Please select at least one partnership interest",
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Invalid email",
          message: "Please provide a valid email address",
        });
      }

      // TODO: Store in database or send to email service
      // For now, just log and return success
      console.log("Partner Inquiry Received:", {
        organizationName,
        contactPerson,
        email,
        phone,
        organizationType,
        partnershipInterests,
        message: message || "(no message provided)",
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Thank you for your interest! We'll contact you within 48 hours.",
      });
    } catch (error: any) {
      console.error("Partner inquiry error:", error);
      res.status(500).json({
        error: "Failed to submit inquiry",
        message: "There was an error processing your inquiry. Please try again later.",
      });
    }
  });

  // ==================== PUBLIC CHAT (NO AUTH REQUIRED) ====================
  
  app.post("/api/public-chat", aiLimiter, async (req, res, next) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ 
          error: "Message is required",
          response: "I'd be happy to help, but I didn't receive your message. Could you please try sending it again?"
        });
      }

      // Validate conversationHistory format if provided
      if (conversationHistory && !Array.isArray(conversationHistory)) {
        return res.status(400).json({ error: "conversationHistory must be an array" });
      }

      // Server-side crisis check - this endpoint is unauthenticated, so there's no
      // client-side JS we can trust to have run; this is the only safety net that matters.
      const crisisCheck = detectCrisisSignal(message);
      if (crisisCheck.isCrisis) {
        const crisisEvent = await storage.createCrisisEvent({
          userId: (req.user as User | undefined)?.id ?? null,
          source: "public_chat",
          matchedSignals: crisisCheck.matchedSignals,
          excerpt: buildCrisisExcerpt(message),
        });
        sendCrisisAlertEmail(crisisEvent).catch(() => {});

        return res.json({ response: CRISIS_RESPONSE_TEXT, isCrisis: true });
      }

      const result = await generateChatResponse(message.trim(), conversationHistory);

      res.json(result);
    } catch (error: any) {
      console.error("Public chat error:", {
        message: error?.message,
        stack: error?.stack
      });
      
      // Return a user-friendly error response instead of throwing
      res.status(500).json({
        response: "I'm experiencing technical difficulties. Please try again in a moment, or reach out to a professional therapist if you need immediate support.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ==================== FEEDBACK ROUTES ====================
  
  // Submit feedback (requires authentication)
  app.post("/api/feedback", requireClient, async (req: any, res, next) => {
    try {
      // Validate request body using Zod schema
      const validationResult = insertFeedbackSchema.safeParse({
        name: req.body.name?.trim() || null,
        role: req.body.role?.trim() || null,
        rating: typeof req.body.rating === 'string' ? parseInt(req.body.rating, 10) : req.body.rating,
        feedbackText: req.body.feedbackText?.trim(),
        featuresUsed: Array.isArray(req.body.featuresUsed) ? req.body.featuresUsed : [],
        showOnHomepage: Boolean(req.body.showOnHomepage),
        status: "pending",
      });

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          message: validationResult.error.errors.map(e => e.message).join(", "),
          details: validationResult.error.errors,
        });
      }

      // Additional validation for rating range
      if (validationResult.data.rating < 1 || validationResult.data.rating > 5) {
        return res.status(400).json({
          error: "Invalid rating",
          message: "Rating must be between 1 and 5",
        });
      }

      // Validate feedback text is not empty
      if (!validationResult.data.feedbackText || validationResult.data.feedbackText.trim().length === 0) {
        return res.status(400).json({
          error: "Invalid feedback",
          message: "Feedback text cannot be empty",
        });
      }

      // Create feedback
      const feedbackData = {
        ...validationResult.data,
        status: "pending" as const,
      };

      const created = await storage.createFeedback(feedbackData);

      res.json({
        success: true,
        message: "Thank you for your feedback! Your insights help us improve Focus for everyone.",
        feedback: created,
      });
    } catch (error: any) {
      console.error("Feedback submission error:", error);

      // getPgErrorCode reads both the raw pg error shape and drizzle-orm
      // >=0.44's DrizzleQueryError wrapper (which moves the original error
      // to .cause) — a plain error.code check here silently stopped
      // matching after this project's drizzle-orm upgrade.
      const pgCode = getPgErrorCode(error);
      if (pgCode === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: "Duplicate feedback",
          message: "You have already submitted this feedback.",
        });
      }

      // Handle other database errors
      if (pgCode?.startsWith('23')) {
        return res.status(400).json({
          error: "Database validation error",
          message: "There was an issue with the data you provided. Please check your input and try again.",
        });
      }

      res.status(500).json({
        error: "Failed to submit feedback",
        message: "There was an error processing your feedback. Please try again later.",
      });
    }
  });

  // Get approved testimonials for homepage (public endpoint)
  app.get("/api/testimonials", async (req, res, next) => {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      res.json({ testimonials });
    } catch (error: any) {
      console.error("Get testimonials error:", error);
      res.status(500).json({
        error: "Failed to fetch testimonials",
        testimonials: [],
      });
    }
  });

  // Admin: Get all feedback (requires admin authentication)
  app.get("/api/admin/feedback", requireAdmin, async (req: any, res, next) => {
    try {
      // Previously fetched every feedback row ever submitted with no bound
      // at all — fine at low volume, a slow query and a huge DOM once this
      // list grows into the hundreds.
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const allFeedback = await storage.getAllFeedback({ limit: limit + 1, offset });
      const hasMore = allFeedback.length > limit;
      res.json({ feedback: allFeedback.slice(0, limit), hasMore });
    } catch (error: any) {
      console.error("Get all feedback error:", error);
      res.status(500).json({
        error: "Failed to fetch feedback",
        feedback: [],
      });
    }
  });

  // Admin: Update feedback status (approve/reject)
  app.patch("/api/admin/feedback/:id/status", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
          message: "Status must be 'pending', 'approved', or 'rejected'",
        });
      }

      const updated = await storage.updateFeedbackStatus(id, status);

      if (!updated) {
        return res.status(404).json({
          error: "Feedback not found",
        });
      }

      res.json({
        success: true,
        message: `Feedback ${status} successfully`,
        feedback: updated,
      });
    } catch (error: any) {
      console.error("Update feedback status error:", error);
      res.status(500).json({
        error: "Failed to update feedback status",
        message: "There was an error updating the feedback status.",
      });
    }
  });

  // ==================== CRISIS ALERTS (ADMIN) ====================

  // Admin: Get crisis events, optionally filtered by status
  app.get("/api/admin/crisis-events", requireAdmin, async (req: any, res, next) => {
    try {
      const status = req.query.status as 'open' | 'reviewed' | 'resolved' | undefined;
      // A growing, unbounded crisis-event backlog makes the "needs review"
      // triage view progressively harder to use — a real safety concern for
      // this app's domain, not just a performance nicety.
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const events = await storage.getCrisisEvents(status, { limit: limit + 1, offset });
      const hasMore = events.length > limit;
      res.json({ events: events.slice(0, limit), hasMore });
    } catch (error: any) {
      console.error("Get crisis events error:", error);
      res.status(500).json({
        error: "Failed to fetch crisis events",
        events: [],
      });
    }
  });

  // Admin: Mark a crisis event as reviewed/resolved
  app.patch("/api/admin/crisis-events/:id/status", requireAdmin, async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const admin = req.user as User;

      if (!status || !['open', 'reviewed', 'resolved'].includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
          message: "Status must be 'open', 'reviewed', or 'resolved'",
        });
      }

      const updated = await storage.updateCrisisEventStatus(id, status, admin.id);

      if (!updated) {
        return res.status(404).json({ error: "Crisis event not found" });
      }

      res.json({ success: true, event: updated });
    } catch (error: any) {
      console.error("Update crisis event status error:", error);
      res.status(500).json({
        error: "Failed to update crisis event status",
        message: "There was an error updating the crisis event status.",
      });
    }
  });

  // ==================== ANALYTICS (ADMIN) ====================

  // Admin: Basic usage analytics overview
  app.get("/api/admin/analytics", requireAdmin, async (req: any, res, next) => {
    try {
      const overview = await storage.getAnalyticsOverview();
      res.json(overview);
    } catch (error: any) {
      console.error("Get analytics overview error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ==================== ADMIN: PAYMENTS, REFUNDS, INVOICES ====================

  // Previously hard-capped at 200 rows with no offset or date filter at
  // all — once more than 200 payments/refunds existed, older records became
  // permanently unreachable through this UI, with no way to page back or
  // reconcile a specific past transaction.
  app.get("/api/admin/payments", requireAdmin, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt)).limit(limit + 1).offset(offset);
      res.json({ payments: rows.slice(0, limit), hasMore: rows.length > limit });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/refunds", requireAdmin, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const rows = await db.select().from(refundsTable).orderBy(desc(refundsTable.createdAt)).limit(limit + 1).offset(offset);
      res.json({ refunds: rows.slice(0, limit), hasMore: rows.length > limit });
    } catch (error) {
      next(error);
    }
  });

  // Raw inbound webhook log — for debugging a webhook that didn't do what
  // was expected (was it received at all? did signature verification pass?
  // did processing throw?), without grepping server logs.
  app.get("/api/admin/webhook-events", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const events = await storage.getWebhookEvents({ status, limit, offset });
      res.json({ events });
    } catch (error) {
      next(error);
    }
  });

  // Chargebacks/disputes — flagged by the webhook handlers but not
  // automated further; this is where a human finds out and can cross-check
  // against the gateway dashboard.
  app.get("/api/admin/disputes", requireAdmin, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const disputeRows = await storage.getDisputes({ limit, offset });
      res.json({ disputes: disputeRows });
    } catch (error) {
      next(error);
    }
  });

  // Findings from the daily gateway-vs-local-DB reconciliation job — see
  // server/reconciliation.ts. Defaults to open mismatches only.
  app.get("/api/admin/reconciliation-mismatches", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "open";
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const mismatches = await storage.getReconciliationMismatches({ status, limit, offset });
      res.json({ mismatches });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/reconciliation-mismatches/:id/resolve", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      await storage.resolveReconciliationMismatch(req.params.id);
      await logSecurityEvent({ type: "admin.action", userId: admin.id, req, metadata: { action: "resolve_reconciliation_mismatch", mismatchId: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/refunds/:sessionId/issue", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const { reason } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ error: "A refund reason is required" });
      }
      const created = await refundBooking(req.params.sessionId, "admin_manual", admin.id);
      await logSecurityEvent({ type: "admin.action", userId: admin.id, req, metadata: { action: "manual_refund", sessionId: req.params.sessionId } });
      res.json({ refunds: created });
    } catch (error) {
      if (mapBookingError(error, res)) return;
      next(error);
    }
  });

  // Partial refund — unlike the full-refund endpoint above, this doesn't
  // cancel the booking; it's for returning less than the full amount (e.g.
  // a service-quality complaint on a session that otherwise completed
  // normally). idempotencyKey must be generated once client-side and reused
  // on retry — see issuePartialRefund's doc comment for why.
  app.post("/api/admin/refunds/:sessionId/partial", requireAdmin, async (req, res, next) => {
    try {
      const admin = req.user as User;
      const { amount, reason, idempotencyKey } = req.body;
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ error: "A refund reason is required" });
      }
      if (typeof amount !== "string" || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: "amount must be a positive decimal string, e.g. \"50.00\"" });
      }
      if (!idempotencyKey || typeof idempotencyKey !== "string") {
        return res.status(400).json({ error: "idempotencyKey is required" });
      }
      const created = await issuePartialRefund(req.params.sessionId, amount, reason.trim(), admin.id, idempotencyKey);
      await logSecurityEvent({ type: "admin.action", userId: admin.id, req, metadata: { action: "partial_refund", sessionId: req.params.sessionId, amount } });
      res.json({ refunds: created });
    } catch (error) {
      if (mapBookingError(error, res)) return;
      next(error);
    }
  });

  // Revenue/commission/instant-acceptance-rate stats.
  app.get("/api/admin/payments/analytics", requireAdmin, async (req, res, next) => {
    try {
      const [revenueRow] = await db
        .select({
          totalRevenue: sqlOp<string>`COALESCE(SUM(${bookingPaymentsTable.amount}), 0)`,
          totalCommission: sqlOp<string>`COALESCE(SUM(${bookingPaymentsTable.platformCommissionAmount}), 0)`,
          totalTax: sqlOp<string>`COALESCE(SUM(${bookingPaymentsTable.taxAmount}), 0)`,
        })
        .from(bookingPaymentsTable)
        .where(eq(bookingPaymentsTable.status, "succeeded"));

      const [refundRow] = await db
        .select({ totalRefunded: sqlOp<string>`COALESCE(SUM(${refundsTable.amount}), 0)` })
        .from(refundsTable)
        .where(eq(refundsTable.status, "succeeded"));

      const [instantRow] = await db
        .select({
          total: sqlOp<number>`COUNT(*) FILTER (WHERE ${sessionsTable.mode} = 'instant' AND ${sessionsTable.status} != 'payment_pending')`,
          accepted: sqlOp<number>`COUNT(*) FILTER (WHERE ${sessionsTable.mode} = 'instant' AND ${sessionsTable.status} IN ('scheduled','in_progress','completed'))`,
        })
        .from(sessionsTable);

      const total = Number(instantRow?.total ?? 0);
      const accepted = Number(instantRow?.accepted ?? 0);

      res.json({
        totalRevenue: revenueRow?.totalRevenue ?? "0.00",
        totalCommission: revenueRow?.totalCommission ?? "0.00",
        totalTax: revenueRow?.totalTax ?? "0.00",
        totalRefunded: refundRow?.totalRefunded ?? "0.00",
        instantSessionAcceptanceRate: total > 0 ? Number(((accepted / total) * 100).toFixed(1)) : null,
        instantSessionsTotal: total,
        instantSessionsAccepted: accepted,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== INVOICES ====================

  app.get("/api/bookings/:sessionId/invoice", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Booking not found" });
      if (session.clientId !== user.id && session.professionalId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
        return res.status(403).json({ error: "You don't have access to this booking" });
      }
      const invoice = await getOrCreateInvoice(req.params.sessionId);
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/bookings/:sessionId/invoice/pdf", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Booking not found" });
      if (session.clientId !== user.id && session.professionalId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
        return res.status(403).json({ error: "You don't have access to this booking" });
      }
      const invoice = await getOrCreateInvoice(req.params.sessionId);
      const pdf = await renderInvoicePdf(invoice);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/bookings/:sessionId/invoice/email", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const session = await storage.getSession(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Booking not found" });
      if (session.clientId !== user.id) return res.status(403).json({ error: "You don't have access to this booking" });

      const invoice = await getOrCreateInvoice(req.params.sessionId);
      const pdf = await renderInvoicePdf(invoice);
      if (user.email) {
        sendInvoiceEmail(user.email, user.fullName || "there", invoice.invoiceNumber, pdf).catch(() => {});
      }
      res.json({ message: "Invoice emailed" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== DAILY CHECK-IN ROUTES ====================
  
  // Create daily check-in
  app.post("/api/check-in", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const validated = insertDailyCheckInSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const checkIn = await storage.createDailyCheckIn(validated);
      res.json({ success: true, checkIn });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid check-in data", details: error.errors });
      }
      console.error("Create check-in error:", error);
      res.status(500).json({ error: "Failed to create check-in" });
    }
  });

  // Get today's check-in
  app.get("/api/check-in/today", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const checkIn = await storage.getTodayCheckIn(user.id);
      res.json({ checkIn });
    } catch (error: any) {
      console.error("Get today check-in error:", error);
      res.status(500).json({ error: "Failed to fetch check-in" });
    }
  });

  // Get recent check-ins
  app.get("/api/check-in/recent", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const days = parseInt(req.query.days as string) || 7;
      const checkIns = await storage.getRecentCheckIns(user.id, days);
      res.json({ checkIns });
    } catch (error: any) {
      console.error("Get recent check-ins error:", error);
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  // ==================== MICRO-PRACTICES ROUTES ====================
  
  // Complete a micro-practice
  app.post("/api/micro-practice", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const validated = insertMicroPracticeSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const practice = await storage.createMicroPractice(validated);
      res.json({ success: true, practice });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid practice data", details: error.errors });
      }
      console.error("Create micro-practice error:", error);
      res.status(500).json({ error: "Failed to record practice" });
    }
  });

  // Get user's micro-practices
  app.get("/api/micro-practices", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const days = parseInt(req.query.days as string) || 30;
      const practices = await storage.getUserMicroPractices(user.id, days);
      res.json({ practices });
    } catch (error: any) {
      console.error("Get micro-practices error:", error);
      res.status(500).json({ error: "Failed to fetch practices" });
    }
  });

  // ==================== COMMUNITY CHALLENGES ROUTES ====================
  
  // Get active challenges
  app.get("/api/challenges", requireAuth, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const challenges = await storage.getUserChallenges(user.id);
      res.json({ challenges });
    } catch (error: any) {
      console.error("Get challenges error:", error);
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  // Join a challenge
  app.post("/api/challenges/:id/join", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const { id } = req.params;
      const participant = await storage.joinChallenge(id, user.id);
      res.json({ success: true, participant });
    } catch (error: any) {
      console.error("Join challenge error:", error);
      res.status(500).json({ error: "Failed to join challenge" });
    }
  });

  // Get challenge participant count (anonymous)
  app.get("/api/challenges/:id/participants", async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const count = await storage.getChallengeParticipantCount(id);
      res.json({ count });
    } catch (error: any) {
      console.error("Get challenge participants error:", error);
      res.status(500).json({ error: "Failed to fetch participant count" });
    }
  });

  // ==================== VOICE MESSAGES ROUTES ====================
  
  // Create voice message
  app.post("/api/voice-message", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const validated = insertVoiceMessageSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const message = await storage.createVoiceMessage(validated);
      res.json({ success: true, message });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid voice message data", details: error.errors });
      }
      console.error("Create voice message error:", error);
      res.status(500).json({ error: "Failed to save voice message" });
    }
  });

  // Get voice messages for a conversation
  // SECURITY: previously scoped only by conversationId, which is set to the
  // user's own id client-side — but any other authenticated client could
  // pass someone else's id and read their private voice/companion messages.
  // Now scoped by the authenticated user too, same as text chat messages.
  app.get("/api/voice-messages/:conversationId", requireClient, async (req: any, res, next) => {
    try {
      const user = req.user as User;
      const { conversationId } = req.params;
      const messages = await storage.getVoiceMessages(user.id, conversationId);
      res.json({ messages });
    } catch (error: any) {
      console.error("Get voice messages error:", error);
      res.status(500).json({ error: "Failed to fetch voice messages" });
    }
  });

  return httpServer;
}
