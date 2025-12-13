// Storage implementation from blueprint:javascript_database
import {
  users,
  professionalProfiles,
  wallets,
  walletTransactions,
  sessions,
  earnings,
  journalEntries,
  chatMessages,
  reviews,
  type User,
  type InsertUser,
  type ProfessionalProfile,
  type InsertProfessionalProfile,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type Session,
  type InsertSession,
  type Earnings,
  type InsertEarnings,
  type JournalEntry,
  type InsertJournalEntry,
  type ChatMessage,
  type InsertChatMessage,
  type Review,
  type InsertReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Professional profile operations
  getProfessionalProfile(userId: string): Promise<ProfessionalProfile | undefined>;
  createProfessionalProfile(profile: InsertProfessionalProfile): Promise<ProfessionalProfile>;
  updateProfessionalAvailability(userId: string, isOnline: boolean): Promise<void>;
  getAllProfessionals(): Promise<Array<ProfessionalProfile & { user: User }>>;
  
  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(walletId: string, amount: string): Promise<Wallet>;
  addWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getUserSessions(userId: string, role: 'client' | 'professional'): Promise<Session[]>;
  updateSessionStatus(id: string, status: string, startTime?: Date, endTime?: Date, durationMinutes?: number, totalCost?: string): Promise<void>;
  getProfessionalUpcomingSessions(professionalId: string): Promise<Array<Session & { client: User }>>;
  
  // Earnings operations
  createEarning(earning: InsertEarnings): Promise<Earnings>;
  getProfessionalEarnings(professionalId: string): Promise<Earnings[]>;
  getTodayEarnings(professionalId: string): Promise<string>;
  
  // Journal operations
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getUserJournalEntries(userId: string): Promise<JournalEntry[]>;
  updateJournalWithAI(id: string, aiInsights: string): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getConversationMessages(userId: string, conversationId: string): Promise<ChatMessage[]>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getProfessionalReviews(professionalId: string): Promise<Review[]>;
  updateProfessionalRating(professionalId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Professional profile operations
  async getProfessionalProfile(userId: string): Promise<ProfessionalProfile | undefined> {
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.userId, userId));
    return profile || undefined;
  }

  async createProfessionalProfile(profile: InsertProfessionalProfile): Promise<ProfessionalProfile> {
    const [created] = await db
      .insert(professionalProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateProfessionalAvailability(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(professionalProfiles)
      .set({ isOnline })
      .where(eq(professionalProfiles.userId, userId));
  }

  async getAllProfessionals(): Promise<Array<ProfessionalProfile & { user: User }>> {
    const results = await db
      .select()
      .from(professionalProfiles)
      .leftJoin(users, eq(professionalProfiles.userId, users.id))
      .where(eq(professionalProfiles.isAvailable, true));
    
    return results.map((r) => ({
      ...r.professional_profiles,
      user: r.users!,
    }));
  }

  // Wallet operations
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const [created] = await db.insert(wallets).values(wallet).returning();
    return created;
  }

  async updateWalletBalance(walletId: string, amount: string): Promise<Wallet> {
    const [updated] = await db
      .update(wallets)
      .set({ 
        balance: amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletId))
      .returning();
    return updated;
  }

  async addWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [created] = await db
      .insert(walletTransactions)
      .values(transaction)
      .returning();
    return created;
  }

  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getUserSessions(userId: string, role: 'client' | 'professional'): Promise<Session[]> {
    const field = role === 'client' ? sessions.clientId : sessions.professionalId;
    return await db
      .select()
      .from(sessions)
      .where(eq(field, userId))
      .orderBy(desc(sessions.scheduledAt));
  }

  async updateSessionStatus(
    id: string,
    status: string,
    startTime?: Date,
    endTime?: Date,
    durationMinutes?: number,
    totalCost?: string
  ): Promise<void> {
    await db
      .update(sessions)
      .set({
        status,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(durationMinutes && { durationMinutes }),
        ...(totalCost && { totalCost }),
      })
      .where(eq(sessions.id, id));
  }

  async getProfessionalUpcomingSessions(professionalId: string): Promise<Array<Session & { client: User }>> {
    const results = await db
      .select()
      .from(sessions)
      .leftJoin(users, eq(sessions.clientId, users.id))
      .where(
        and(
          eq(sessions.professionalId, professionalId),
          eq(sessions.status, 'scheduled')
        )
      )
      .orderBy(sessions.scheduledAt);
    
    return results.map((r) => ({
      ...r.sessions,
      client: r.users!,
    }));
  }

  // Earnings operations
  async createEarning(earning: InsertEarnings): Promise<Earnings> {
    const [created] = await db.insert(earnings).values(earning).returning();
    return created;
  }

  async getProfessionalEarnings(professionalId: string): Promise<Earnings[]> {
    return await db
      .select()
      .from(earnings)
      .where(eq(earnings.professionalId, professionalId))
      .orderBy(desc(earnings.createdAt));
  }

  async getTodayEarnings(professionalId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), 0)` })
      .from(earnings)
      .where(
        and(
          eq(earnings.professionalId, professionalId),
          gte(earnings.createdAt, today)
        )
      );
    
    return result?.total || '0';
  }

  // Journal operations
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [created] = await db.insert(journalEntries).values(entry).returning();
    return created;
  }

  async getUserJournalEntries(userId: string): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt));
  }

  async updateJournalWithAI(id: string, aiInsights: string): Promise<void> {
    await db
      .update(journalEntries)
      .set({ aiInsights })
      .where(eq(journalEntries.id, id));
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getConversationMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.conversationId, conversationId)
        )
      )
      .orderBy(chatMessages.createdAt);
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    
    // Update professional's rating
    await this.updateProfessionalRating(review.professionalId);
    
    return created;
  }

  async getProfessionalReviews(professionalId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.professionalId, professionalId))
      .orderBy(desc(reviews.createdAt));
  }

  async updateProfessionalRating(professionalId: string): Promise<void> {
    const [result] = await db
      .select({
        avgRating: sql<string>`ROUND(AVG(${reviews.rating})::numeric, 2)`,
        totalReviews: sql<number>`COUNT(*)::integer`,
      })
      .from(reviews)
      .where(eq(reviews.professionalId, professionalId));
    
    if (result) {
      await db
        .update(professionalProfiles)
        .set({
          rating: result.avgRating,
          totalReviews: result.totalReviews,
        })
        .where(eq(professionalProfiles.userId, professionalId));
    }
  }
}

export const storage = new DatabaseStorage();
