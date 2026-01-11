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
  gender: text("gender"), // 'male', 'female', or 'other'
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
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_wallet_transactions_wallet_id").on(table.walletId),
  index("IDX_wallet_transactions_created_at").on(table.createdAt),
]);

// Razorpay payment orders for secure tracking
export const paymentOrders = pgTable("payment_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  razorpayOrderId: text("razorpay_order_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
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
}, (table) => [
  index("IDX_sessions_client_id").on(table.clientId),
  index("IDX_sessions_professional_id").on(table.professionalId),
  index("IDX_sessions_scheduled_at").on(table.scheduledAt),
  index("IDX_sessions_status").on(table.status),
]);

// Professional earnings tracking
export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'paid'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_earnings_professional_id").on(table.professionalId),
  index("IDX_earnings_created_at").on(table.createdAt),
]);

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
}, (table) => [
  index("IDX_journal_entries_user_id").on(table.userId),
  index("IDX_journal_entries_created_at").on(table.createdAt),
]);

// Chat messages (AI chatbot conversations)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  bhagavadGitaReference: text("bhagavad_gita_reference"), // verse reference if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_chat_messages_user_id").on(table.userId),
  index("IDX_chat_messages_conversation_id").on(table.conversationId),
  index("IDX_chat_messages_created_at").on(table.createdAt),
]);

// Reviews and ratings for professionals
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_reviews_professional_id").on(table.professionalId),
  index("IDX_reviews_created_at").on(table.createdAt),
]);

// Feedback/Testimonials from users
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // Optional - can be empty for anonymous
  role: text("role"), // e.g., "Student", "Professional"
  rating: integer("rating").notNull(), // 1-5
  feedbackText: text("feedback_text").notNull(),
  featuresUsed: text("features_used").array().default(sql`ARRAY[]::text[]`), // Array of features
  showOnHomepage: boolean("show_on_homepage").notNull().default(false),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_feedback_status").on(table.status),
  index("IDX_feedback_show_on_homepage").on(table.showOnHomepage),
  index("IDX_feedback_created_at").on(table.createdAt),
]);

// Daily emotional check-ins
export const dailyCheckIns = pgTable("daily_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feeling: text("feeling"), // Optional text or emoji
  moodScore: integer("mood_score"), // Optional 1-10 scale
  notes: text("notes"), // Optional additional context
  checkInDate: timestamp("check_in_date").defaultNow().notNull(), // Date of check-in
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_daily_check_ins_user_id").on(table.userId),
  index("IDX_daily_check_ins_check_in_date").on(table.checkInDate),
]);

// Micro-practices completion tracking
export const microPractices = pgTable("micro_practices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  practiceType: text("practice_type").notNull(), // 'breathing', 'grounding', 'gratitude', 'meditation'
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  durationSeconds: integer("duration_seconds"), // Optional, no pressure
  notes: text("notes"), // Optional reflection
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_micro_practices_user_id").on(table.userId),
  index("IDX_micro_practices_completed_at").on(table.completedAt),
]);

// Community challenges/events (optional participation)
export const communityChallenges = pgTable("community_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'meditation', 'breathing', 'gratitude', 'yoga'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  participantCount: integer("participant_count").default(0), // Anonymous count only
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_community_challenges_active").on(table.isActive),
  index("IDX_community_challenges_dates").on(table.startDate, table.endDate),
]);

// Challenge participation (anonymous, no social pressure)
export const challengeParticipants = pgTable("challenge_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => communityChallenges.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  // No completion tracking to avoid pressure
}, (table) => [
  index("IDX_challenge_participants_challenge").on(table.challengeId),
  index("IDX_challenge_participants_user").on(table.userId),
  index("IDX_challenge_participants_unique").on(table.challengeId, table.userId),
]);

// Voice messages for chatbot (optional)
export const voiceMessages = pgTable("voice_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").notNull(),
  audioUrl: text("audio_url"), // Optional - stored audio if needed
  transcript: text("transcript"), // Speech-to-text result
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_voice_messages_user_id").on(table.userId),
  index("IDX_voice_messages_conversation_id").on(table.conversationId),
]);

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

export const feedbackRelations = relations(feedback, () => ({}));

export const dailyCheckInsRelations = relations(dailyCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [dailyCheckIns.userId],
    references: [users.id],
  }),
}));

export const microPracticesRelations = relations(microPractices, ({ one }) => ({
  user: one(users, {
    fields: [microPractices.userId],
    references: [users.id],
  }),
}));

export const communityChallengesRelations = relations(communityChallenges, ({ many }) => ({
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(communityChallenges, {
    fields: [challengeParticipants.challengeId],
    references: [communityChallenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
}));

export const voiceMessagesRelations = relations(voiceMessages, ({ one }) => ({
  user: one(users, {
    fields: [voiceMessages.userId],
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

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentOrderSchema = createInsertSchema(paymentOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDailyCheckInSchema = createInsertSchema(dailyCheckIns).omit({
  id: true,
  createdAt: true,
});

export const insertMicroPracticeSchema = createInsertSchema(microPractices).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityChallengeSchema = createInsertSchema(communityChallenges).omit({
  id: true,
  createdAt: true,
  participantCount: true,
});

export const insertChallengeParticipantSchema = createInsertSchema(challengeParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertVoiceMessageSchema = createInsertSchema(voiceMessages).omit({
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

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;
export type PaymentOrder = typeof paymentOrders.$inferSelect;

export type InsertDailyCheckIn = z.infer<typeof insertDailyCheckInSchema>;
export type DailyCheckIn = typeof dailyCheckIns.$inferSelect;

export type InsertMicroPractice = z.infer<typeof insertMicroPracticeSchema>;
export type MicroPractice = typeof microPractices.$inferSelect;

export type InsertCommunityChallenge = z.infer<typeof insertCommunityChallengeSchema>;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;

export type InsertChallengeParticipant = z.infer<typeof insertChallengeParticipantSchema>;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;

export type InsertVoiceMessage = z.infer<typeof insertVoiceMessageSchema>;
export type VoiceMessage = typeof voiceMessages.$inferSelect;

// Upsert user type for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
