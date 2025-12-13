import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireProfessional, requireClient } from "./auth";
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
  type User,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== AUTH ROUTES ====================
  
  // Register new user
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Create wallet if client
      if (user.role === 'client') {
        await storage.createWallet({ userId: user.id, balance: "0", totalRecharged: "0" });
      }
      
      // Create professional profile if professional
      if (user.role === 'professional' && req.body.professionalProfile) {
        await storage.createProfessionalProfile({
          ...req.body.professionalProfile,
          userId: user.id,
        });
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            fullName: user.fullName,
          } 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });
  
  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ 
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
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = req.user as User;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        profileImage: user.profileImage,
      }
    });
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
  
  // Recharge wallet (would integrate with Stripe)
  app.post("/api/wallet/recharge", requireClient, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { amount } = req.body;
      
      const wallet = await storage.getWallet(user.id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      // TODO: Integrate with Stripe payment here
      // For now, simulate successful payment
      
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
      const user = req.user as User;
      const todayEarnings = await storage.getTodayEarnings(user.id);
      res.json({ todayEarnings });
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

  return httpServer;
}
