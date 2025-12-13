import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const authSessions = pgTable(
  "auth_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_auth_session_expire").on(table.expire)],
);

// Users table - supports both clients and professionals
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  role: text("role").notNull().default("client"), // 'client' or 'professional'
  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Professional profiles - additional info for therapists
export const professionalProfiles = pgTable("professional_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  specialization: text("specialization").notNull(),
  qualification: text("qualification").notNull(),
  experience: integer("experience").notNull(), // years of experience
  bio: text("bio"),
  languages: text("languages").array().notNull().default(sql`ARRAY['English']::text[]`),
  pricePerMinute: decimal("price_per_minute", { precision: 10, scale: 2 }).notNull(), // ₹/minute
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  licenseNumber: text("license_number"),
});

// Wallet system for clients
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRecharged: decimal("total_recharged", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions (recharges and session payments)
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'recharge' or 'payment'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  sessionId: varchar("session_id"), // reference to session if payment
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments/Sessions
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  type: text("type").notNull(), // 'video', 'audio', 'chat'
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Professional earnings tracking
export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'paid'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Journal entries with AI insights
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content").notNull(),
  mood: text("mood"), // 'happy', 'sad', 'anxious', 'calm', 'stressed', etc.
  aiInsights: text("ai_insights"), // AI-generated insights
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat messages (AI chatbot conversations)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  bhagavadGitaReference: text("bhagavad_gita_reference"), // verse reference if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews and ratings for professionals
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  professionalProfile: one(professionalProfiles, {
    fields: [users.id],
    references: [professionalProfiles.userId],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  clientSessions: many(sessions, { relationName: "clientSessions" }),
  professionalSessions: many(sessions, { relationName: "professionalSessions" }),
  journalEntries: many(journalEntries),
  chatMessages: many(chatMessages),
  earnings: many(earnings),
}));

export const professionalProfilesRelations = relations(professionalProfiles, ({ one }) => ({
  user: one(users, {
    fields: [professionalProfiles.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  client: one(users, {
    fields: [sessions.clientId],
    references: [users.id],
    relationName: "clientSessions",
  }),
  professional: one(users, {
    fields: [sessions.professionalId],
    references: [users.id],
    relationName: "professionalSessions",
  }),
  reviews: many(reviews),
  earnings: many(earnings),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  session: one(sessions, {
    fields: [reviews.sessionId],
    references: [sessions.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
  }),
  professional: one(users, {
    fields: [reviews.professionalId],
    references: [users.id],
  }),
}));

export const earningsRelations = relations(earnings, ({ one }) => ({
  professional: one(users, {
    fields: [earnings.professionalId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [earnings.sessionId],
    references: [sessions.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProfessionalProfileSchema = createInsertSchema(professionalProfiles).omit({
  id: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertEarningsSchema = createInsertSchema(earnings).omit({
  id: true,
  createdAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProfessionalProfile = z.infer<typeof insertProfessionalProfileSchema>;
export type ProfessionalProfile = typeof professionalProfiles.$inferSelect;

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertEarnings = z.infer<typeof insertEarningsSchema>;
export type Earnings = typeof earnings.$inferSelect;

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Upsert user type for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
