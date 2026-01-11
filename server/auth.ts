import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { User } from "@shared/schema";
import bcrypt from "bcryptjs";

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
    secret: process.env.SESSION_SECRET || "focus-mental-health-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

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
              return done(new Error("No email found in Google profile"), null);
            }

            // Check if user exists
            let user = await storage.getUserByEmail(email);

            if (!user) {
              // Create new user
              user = await storage.createUser({
                email,
                fullName: profile.displayName || profile.name?.givenName || "User",
                role: 'client', // Default to client, can be changed later
                profileImage: profile.photos?.[0]?.value,
              });

              // Create wallet for client
              await storage.createWallet({
                userId: user.id,
                balance: "0",
                totalRecharged: "0",
              });
            } else if (!user.profileImage && profile.photos?.[0]?.value) {
              // Update profile image if missing
              // Note: You may need to add an updateUser method to storage
            }

            return done(null, user);
          } catch (error) {
            return done(error, null);
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

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please log in" });
}

// Alias for compatibility with existing code
export const isAuthenticated = requireAuth;

// Middleware to check if user has professional role
export function requireProfessional(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user as User).role === 'professional') {
    return next();
  }
  res.status(403).json({ error: "Forbidden - Professional access required" });
}

  // Middleware to check if user has client role
  export function requireClient(req: any, res: any, next: any) {
    if (req.isAuthenticated() && (req.user as User).role === 'client') {
      return next();
    }
    res.status(403).json({ error: "Forbidden - Client access required" });
  }

  // Middleware to check if user has admin role
  export function requireAdmin(req: any, res: any, next: any) {
    if (req.isAuthenticated() && (req.user as User).role === 'admin') {
      return next();
    }
    res.status(403).json({ error: "Forbidden - Admin access required" });
  }
