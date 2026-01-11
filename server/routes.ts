import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireClient, requireProfessional, requireAdmin } from "./auth";
import passport from "passport";
import bcrypt from "bcryptjs";
import { generateChatResponse, generateJournalInsights, analyzeMood } from "./ai";
import {
  insertUserSchema,
  insertProfessionalProfileSchema,
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
  type User,
} from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { getRazorpayClient, getRazorpayKeyId, verifyPaymentSignature } from "./razorpayClient";
import { testConnection } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== AUTH ROUTES ====================
  
  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Register new user (for email/password registration)
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, fullName, role } = req.body;
      
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: "Email, password and full name are required" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
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
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user with retry logic
      let user;
      retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          user = await storage.createUser({
            email,
            password: hashedPassword,
            fullName,
            role: role || 'client',
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
      
      if (user.role === 'professional' && req.body.professionalProfile) {
        try {
          await storage.createProfessionalProfile({
            ...req.body.professionalProfile,
            userId: user.id,
          });
        } catch (profileError) {
          console.error("Failed to create professional profile:", profileError);
          // Don't fail registration if profile creation fails
        }
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          fullName: user.fullName,
        } 
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
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            fullName: user.fullName,
            profileImage: user.profileImage,
          } 
        });
      });
    })(req, res, next);
  });

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn("Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
      return res.redirect("/login?error=google_not_configured");
    }
    try {
      passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
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
        // User is now authenticated via session
        // Redirect to home with success flag
        res.redirect("/?oauth_success=true");
      } catch (error) {
        console.error("Google callback error:", error);
        res.redirect("/login?error=google_auth_failed");
      }
    }
  );

  // Apple OAuth routes (Sign in with Apple)
  app.get("/api/auth/apple", (req, res) => {
    // Apple Sign In requires client-side implementation
    // This endpoint will be called from the frontend after Apple authentication
    const { id_token, user } = req.query;
    
    if (!id_token) {
      return res.redirect("/login?error=apple_auth_failed");
    }

    // For now, redirect to a handler that will process the token
    // In production, you'd verify the JWT token from Apple
    res.redirect(`/api/auth/apple/callback?id_token=${id_token}&user=${encodeURIComponent(JSON.stringify(user || {}))}`);
  });

  app.get("/api/auth/apple/callback", async (req: any, res) => {
    try {
      // Note: In production, you should verify the Apple JWT token
      // For now, this is a placeholder that shows the flow
      const { id_token, user } = req.query;
      
      if (!id_token) {
        return res.redirect("/login?error=apple_auth_failed");
      }

      // Parse user data if provided
      let userData: any = {};
      if (user) {
        try {
          userData = JSON.parse(decodeURIComponent(user as string));
        } catch (e) {
          console.error("Error parsing Apple user data:", e);
        }
      }

      // In production, decode and verify the JWT token from Apple
      // For now, we'll create a placeholder user flow
      // You'll need to implement proper JWT verification using Apple's public keys
      
      res.redirect("/login?error=apple_not_configured");
    } catch (error) {
      console.error("Apple callback error:", error);
      res.redirect("/login?error=apple_auth_failed");
    }
  });

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
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
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
      res.json({ profile, user });
    } catch (error) {
      next(error);
    }
  });

  // Update professional availability
  app.patch("/api/professionals/availability", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { isOnline } = req.body;
      await storage.updateProfessionalAvailability(user.id, isOnline);
      res.json({ message: "Availability updated" });
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
  app.post("/api/wallet/checkout", requireClient, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { amount, packName } = req.body;
      const userId = user.dbUser?.id || user.claims?.sub;
      
      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Minimum recharge amount is ₹100" });
      }

      const existingWallet = await storage.getWallet(userId);
      if (!existingWallet) {
        await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      
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
        success_url: `${baseUrl}/wallet?success=true&amount=${amount}`,
        cancel_url: `${baseUrl}/wallet?canceled=true`,
        metadata: {
          userId,
          amount: amount.toString(),
          type: 'wallet_recharge',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Stripe checkout error:', error);
      next(error);
    }
  });

  // Simulate wallet recharge (for development/testing)
  app.post("/api/wallet/recharge", requireClient, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { amount } = req.body;
      const userId = user.dbUser?.id || user.claims?.sub;
      
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const newBalance = (parseFloat(wallet.balance) + parseFloat(amount)).toFixed(2);
      const updatedWallet = await storage.updateWalletBalance(wallet.id, newBalance);
      
      await storage.addWalletTransaction({
        walletId: wallet.id,
        type: 'recharge',
        amount: amount.toString(),
        description: `Wallet recharge of ₹${amount}`,
      });
      
      res.json({ wallet: updatedWallet });
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
  app.post("/api/wallet/razorpay-order", requireClient, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { amount, packName } = req.body;
      const userId = user.dbUser?.id || user.claims?.sub;

      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Minimum recharge amount is ₹100" });
      }

      const existingWallet = await storage.getWallet(userId);
      if (!existingWallet) {
        await storage.createWallet({ userId, balance: "0", totalRecharged: "0" });
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
  app.post("/api/wallet/razorpay-verify", requireClient, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const userId = user.dbUser?.id || user.claims?.sub;

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
        return res.status(400).json({ error: "Payment already processed" });
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

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const rechargeAmount = parseFloat(paymentOrder.amount);
      const newBalance = (parseFloat(wallet.balance) + rechargeAmount).toFixed(2);
      const updatedWallet = await storage.updateWalletBalance(wallet.id, newBalance);

      await storage.addWalletTransaction({
        walletId: wallet.id,
        type: "recharge",
        amount: rechargeAmount.toString(),
        description: `UPI wallet recharge of ₹${rechargeAmount} (Payment ID: ${razorpay_payment_id})`,
        razorpayPaymentId: razorpay_payment_id,
      });

      res.json({ success: true, wallet: updatedWallet });
    } catch (error) {
      console.error("Razorpay verify error:", error);
      next(error);
    }
  });
  
  // ==================== SESSION ROUTES ====================
  
  // Create new session booking
  app.post("/api/sessions", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertSessionSchema.parse({
        ...req.body,
        clientId: user.id,
        status: 'scheduled',
      });
      
      const session = await storage.createSession(data);
      res.json({ session });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
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
  
  // Update session status
  app.patch("/api/sessions/:id/status", requireAuth, async (req, res, next) => {
    try {
      const { status, startTime, endTime, durationMinutes, totalCost } = req.body;
      await storage.updateSessionStatus(
        req.params.id,
        status,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined,
        durationMinutes,
        totalCost
      );
      
      // If session completed, create earning record
      if (status === 'completed' && totalCost) {
        const session = await storage.getSession(req.params.id);
        if (session) {
          await storage.createEarning({
            professionalId: session.professionalId,
            sessionId: session.id,
            amount: totalCost,
            status: 'pending',
          });
        }
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
      const professionalId = user.dbUser?.id || user.claims?.sub;
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
      const professionalId = user.dbUser?.id || user.claims?.sub;
      
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
        avgRating: profile?.rating || "5.0",
        totalReviews: reviews.length,
        profileViews: Math.floor(Math.random() * 100) + 50,
      });
    } catch (error) {
      next(error);
    }
  });

  // Get professional's upcoming sessions with client details
  app.get("/api/professional/sessions/today", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.dbUser?.id || user.claims?.sub;
      const sessions = await storage.getProfessionalUpcomingSessions(professionalId);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  });

  // Get professional wallet balance
  app.get("/api/professional/wallet", requireProfessional, async (req, res, next) => {
    try {
      const user = req.user as any;
      const professionalId = user.dbUser?.id || user.claims?.sub;
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
  app.post("/api/journal", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { title, content, mood } = req.body;
      
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
      
      res.json({ entry });
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
  app.post("/api/chat", requireClient, async (req, res, next) => {
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
  app.post("/api/reviews", requireClient, async (req, res, next) => {
    try {
      const data = insertReviewSchema.parse(req.body);
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
  
  app.post("/api/public-chat", async (req, res, next) => {
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
      
      // Handle database errors
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: "Duplicate feedback",
          message: "You have already submitted this feedback.",
        });
      }

      // Handle other database errors
      if (error.code && error.code.startsWith('23')) {
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
      const allFeedback = await storage.getAllFeedback();
      res.json({ feedback: allFeedback });
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
  app.get("/api/voice-messages/:conversationId", requireClient, async (req: any, res, next) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getVoiceMessages(conversationId);
      res.json({ messages });
    } catch (error: any) {
      console.error("Get voice messages error:", error);
      res.status(500).json({ error: "Failed to fetch voice messages" });
    }
  });

  return httpServer;
}
