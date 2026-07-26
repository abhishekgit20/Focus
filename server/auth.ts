import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { User } from "@shared/schema";
import { SESSION_SECRET } from "./sessionSecret";
import { hashPassword, verifyPassword, needsRehash } from "./security/passwordHashing";
import type { InsertUser } from "@shared/schema";

// Fixed reference hash used to run a dummy verify when the email doesn't
// exist, so login response timing doesn't leak whether an account exists.
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$HKKJhIZ34pqjtwp37DdUcQ$yY5y7hJjxnAjkh1RqSzGxsW9WqQlix1SVAAy36ZtemE";

const pgStore = connectPg(session);

export function setupAuth(app: Express) {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "auth_sessions",
  });

  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax", // Always use 'lax' for better compatibility
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);

          if (!user || !user.password) {
            // Run a dummy verify so a nonexistent email takes roughly the
            // same time as a wrong password against a real one.
            await verifyPassword(password, DUMMY_HASH).catch(() => {});
            return done(null, false, { message: "Invalid email or password" });
          }

          if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            // SECURITY: a distinct message/timing here (vs. plain "wrong
            // password") lets an attacker probe arbitrary emails and learn
            // which ones exist purely from getting a lockout response,
            // without ever guessing the password. Run the same real verify
            // as the non-locked path so response timing doesn't leak it
            // either — the result is discarded, login is denied either way.
            // `locked` is passed through to the caller for audit logging
            // only; routes.ts must not surface it in the HTTP response.
            await verifyPassword(password, user.password).catch(() => {});
            return done(null, false, { message: "Invalid email or password", locked: true } as any);
          }

          const isValidPassword = await verifyPassword(password, user.password);

          if (!isValidPassword) {
            const attempts = user.failedLoginAttempts + 1;
            const updates: Partial<InsertUser> = { failedLoginAttempts: attempts };
            let lockMessage: string | undefined;

            // Progressive lockout: each repeat offense locks longer.
            if (attempts >= 12) {
              updates.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
              lockMessage = "Too many failed attempts. Account locked for 2 hours.";
            } else if (attempts >= 8) {
              updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
              lockMessage = "Too many failed attempts. Account locked for 30 minutes.";
            } else if (attempts >= 5) {
              updates.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
              lockMessage = "Too many failed attempts. Account locked for 5 minutes.";
            }

            await storage.updateUser(user.id, updates);
            // SECURITY: don't surface lockMessage externally — it would tell
            // an attacker their guesses just crossed the lockout threshold,
            // confirming the account is real. `locked` still flows to the
            // caller for audit logging only (see the pre-existing-lock branch
            // above for the fuller rationale).
            return done(null, false, { message: "Invalid email or password", locked: !!lockMessage, userId: user.id } as any);
          }

          // Success: clear the failure counter, and lazily upgrade legacy
          // bcrypt hashes to Argon2id — no forced reset, no user-visible change.
          const resetUpdates: Partial<InsertUser> = { failedLoginAttempts: 0, lockedUntil: null };
          if (needsRehash(user.password)) {
            resetUpdates.password = await hashPassword(password);
          }
          await storage.updateUser(user.id, resetUpdates);

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Configure Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            // Check if user exists
            let user = await storage.getUserByEmail(email);

            if (!user) {
              // Create new user. OAuth accounts skip email verification —
              // Google has already verified this address.
              user = await storage.createUser({
                email,
                fullName: profile.displayName || profile.name?.givenName || "User",
                role: 'client', // Default to client, can be changed later
                profileImage: profile.photos?.[0]?.value,
                emailVerified: true,
              });

              // Create wallet for client
              await storage.createWallet({
                userId: user.id,
                balance: "0",
                totalRecharged: "0",
              });
            } else if (!user.profileImage && profile.photos?.[0]?.value) {
              user = await storage.updateUser(user.id, { profileImage: profile.photos[0].value });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Authentication/role middleware lives in ./security/roleMiddleware — it's
// pure decision logic with no DB dependency, which also makes it unit
// testable in isolation. Re-exported here so existing call sites
// (`import { requireAuth, ... } from "./auth"`) don't need to change.
export {
  requireAuth,
  isAuthenticated,
  requireProfessional,
  requireClient,
  requireAdmin,
  requireSuperAdmin,
} from "./security/roleMiddleware";
