import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
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

const requireAuth = isAuthenticated;

const requireClient = async (req: any, res: any, next: any) => {
  isAuthenticated(req, res, async () => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ message: "Client access required" });
    }
    req.user.dbUser = user;
    next();
  });
};

const requireProfessional = async (req: any, res: any, next: any) => {
  isAuthenticated(req, res, async () => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'professional') {
      return res.status(403).json({ message: "Professional access required" });
    }
    req.user.dbUser = user;
    next();
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== AUTH ROUTES ====================
  
  // Get current user (for Replit Auth)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        fullName,
        role: role || 'client',
      });
      
      if (user.role === 'client') {
        await storage.createWallet({ userId: user.id, balance: "0", totalRecharged: "0" });
      }
      
      if (user.role === 'professional' && req.body.professionalProfile) {
        await storage.createProfessionalProfile({
          ...req.body.professionalProfile,
          userId: user.id,
        });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          fullName: user.fullName,
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      next(error);
    }
  });
  
  // Get current user (legacy endpoint)
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub;
      const user = await storage.getUser(userId);
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

  // ==================== PUBLIC CHAT (NO AUTH REQUIRED) ====================
  
  app.post("/api/public-chat", async (req, res, next) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const result = await generateChatResponse(message, conversationHistory);
      
      res.json(result);
    } catch (error) {
      console.error("Public chat error:", error);
      next(error);
    }
  });

  return httpServer;
}
