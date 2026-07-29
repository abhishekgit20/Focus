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
  paymentOrders,
  feedback,
  dailyCheckIns,
  microPractices,
  communityChallenges,
  challengeParticipants,
  voiceMessages,
  crisisEvents,
  passwordHistory,
  knownDevices,
  type User,
  type InsertUser,
  type ProfessionalProfile,
  type InsertProfessionalProfile,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
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
  sessionMessages,
  type SessionMessage,
  type InsertSessionMessage,
  type PaymentOrder,
  type InsertPaymentOrder,
  type Feedback,
  type InsertFeedback,
  type DailyCheckIn,
  type InsertDailyCheckIn,
  type MicroPractice,
  type InsertMicroPractice,
  type CommunityChallenge,
  type InsertCommunityChallenge,
  type ChallengeParticipant,
  type InsertChallengeParticipant,
  type VoiceMessage,
  type InsertVoiceMessage,
  type CrisisEvent,
  type InsertCrisisEvent,
  professionalApplications,
  notifications,
  sessionTemplates,
  professionalSessionOfferings,
  professionalAvailability,
  professionalLeave,
  type ProfessionalApplication,
  type InsertProfessionalApplication,
  type Notification,
  type InsertNotification,
  type SessionTemplate,
  type ProfessionalSessionOffering,
  type InsertProfessionalSessionOffering,
  type ProfessionalAvailability as ProfessionalAvailabilityRow,
  type InsertProfessionalAvailability,
  type ProfessionalLeave,
  type InsertProfessionalLeave,
  webhookEvents,
  type WebhookEvent,
  type InsertWebhookEvent,
  disputes,
  type Dispute,
  type InsertDispute,
  reconciliationMismatches,
  type ReconciliationMismatch,
  type InsertReconciliationMismatch,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, lt } from "drizzle-orm";
import { sanitizeUser, type SafeUser } from "./security/sanitizeUser";
import * as money from "./lib/money";
import { isUniqueViolation } from "./lib/dbErrors";
import { computeBreakdownFromBase } from "./lib/pricingMath";

export type { SafeUser };
export { sanitizeUser };

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailVerificationTokenHash(hash: string): Promise<User | undefined>;
  getUserByPasswordResetTokenHash(hash: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  addPasswordHistory(userId: string, passwordHash: string): Promise<void>;
  getRecentPasswordHashes(userId: string, limit?: number): Promise<string[]>;
  anonymizeUser(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  createUser(user: InsertUser): Promise<User>;

  // Professional profile operations
  getProfessionalProfile(userId: string): Promise<(ProfessionalProfile & { user: SafeUser }) | undefined>;
  createProfessionalProfile(profile: InsertProfessionalProfile): Promise<ProfessionalProfile>;
  updateProfessionalProfile(userId: string, updates: Partial<InsertProfessionalProfile>): Promise<ProfessionalProfile>;
  updateProfessionalAvailability(userId: string, isOnline: boolean): Promise<void>;
  getAllProfessionals(): Promise<Array<ProfessionalProfile & { user: SafeUser; minPrice: string | null }>>;
  suspendProfessional(userId: string, reason: string): Promise<void>;
  reactivateProfessional(userId: string): Promise<void>;

  // Professional application (verification) operations
  createProfessionalApplication(application: InsertProfessionalApplication & { userId: string; documents: unknown[] }): Promise<ProfessionalApplication>;
  getProfessionalApplication(id: string): Promise<ProfessionalApplication | undefined>;
  getUserLatestApplication(userId: string): Promise<ProfessionalApplication | undefined>;
  hasPendingOrApprovedApplication(userId: string): Promise<boolean>;
  getApplicationsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Array<ProfessionalApplication & { applicant: SafeUser }>>;
  approveProfessionalApplication(id: string, reviewerId: string): Promise<ProfessionalApplication>;
  rejectProfessionalApplication(id: string, reviewerId: string, reason: string): Promise<ProfessionalApplication>;

  // Session template catalog (fixed durations — global, not per-professional)
  getSessionTemplates(): Promise<SessionTemplate[]>;
  getSessionTemplate(id: string): Promise<SessionTemplate | undefined>;

  // Professional session offerings (per-professional pricing, replaces pricePerMinute)
  getProfessionalOfferings(professionalId: string): Promise<ProfessionalSessionOffering[]>;
  upsertProfessionalOffering(input: InsertProfessionalSessionOffering): Promise<ProfessionalSessionOffering>;
  getOffering(professionalId: string, consultationType: string, sessionTemplateId: string): Promise<ProfessionalSessionOffering | undefined>;
  getMinPriceForProfessional(professionalId: string): Promise<string | null>;
  professionalHasAnyEnabledOffering(professionalId: string): Promise<boolean>;

  // Professional working hours & leave
  getProfessionalAvailability(professionalId: string): Promise<ProfessionalAvailabilityRow[]>;
  setProfessionalAvailability(input: InsertProfessionalAvailability): Promise<ProfessionalAvailabilityRow>;
  deleteProfessionalAvailability(professionalId: string, dayOfWeek: number): Promise<void>;
  getProfessionalLeave(professionalId: string): Promise<ProfessionalLeave[]>;
  createProfessionalLeave(leave: InsertProfessionalLeave): Promise<ProfessionalLeave>;
  deleteProfessionalLeave(id: string, professionalId: string): Promise<void>;
  // Active (non-cancelled, non-completed) bookings whose scheduledAt falls
  // inside [startDate, endDate] — used to block a professional from
  // scheduling leave over sessions a client has already paid for.
  getConflictingSessions(professionalId: string, startDate: Date, endDate: Date): Promise<Session[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;
  // Idempotent wallet credit for gateway-confirmed recharges (Stripe/Razorpay).
  // Locks the wallet row and relies on the UQ_wallet_transactions_stripe/razorpay_payment_id
  // constraints to make a duplicate delivery of the same payment a no-op instead
  // of double-crediting. Returns credited:false if this payment was already processed.
  creditWalletForGatewayPayment(params: {
    userId: string;
    amount: string;
    description: string;
    stripePaymentId?: string;
    razorpayPaymentId?: string;
  }): Promise<{ credited: boolean; wallet?: Wallet }>;
  // Lets a caller check whether a specific Stripe payment intent has already
  // been credited, e.g. the wallet page polling post-checkout-redirect
  // status without waiting on the webhook to have definitely landed.
  getWalletTransactionByStripePaymentId(stripePaymentId: string): Promise<WalletTransaction | undefined>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getUserSessions(userId: string, role: 'client' | 'professional'): Promise<Session[]>;
  updateSessionStatus(id: string, status: string, startTime?: Date, endTime?: Date, durationMinutes?: number, totalCost?: string): Promise<void>;
  getProfessionalUpcomingSessions(professionalId: string): Promise<Array<Session & { client: SafeUser }>>;
  getProfessionalPendingRequests(professionalId: string): Promise<Array<Session & { client: SafeUser }>>;
  getAllProfessionalSessions(professionalId: string): Promise<Array<Session & { client: SafeUser }>>;
  getExpiredInstantRequests(): Promise<Session[]>;
  getSimilarOnlineProfessionals(
    excludeProfessionalId: string,
    consultationType: string,
    sessionTemplateId: string
  ): Promise<Array<{ id: string; fullName: string | null; specialization: string; profileImage: string | null }>>;

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
  getReviewBySessionId(sessionId: string): Promise<Review | undefined>;
  getProfessionalReviews(professionalId: string): Promise<Review[]>;
  updateProfessionalRating(professionalId: string): Promise<void>;

  // Session chat operations (live consultation chat — not the AI companion)
  createSessionMessage(message: InsertSessionMessage): Promise<SessionMessage>;
  getSessionMessages(sessionId: string): Promise<SessionMessage[]>;

  // Webhook event log — durable record of every inbound gateway webhook,
  // independent of whether business processing of it succeeded.
  // recordWebhookEventIfNew returns undefined if (gateway, eventId) was
  // already logged, i.e. this is a gateway redelivery of an event we've
  // already at least received — callers should skip processing entirely.
  recordWebhookEventIfNew(event: InsertWebhookEvent): Promise<WebhookEvent | undefined>;
  markWebhookEventProcessed(id: string): Promise<void>;
  markWebhookEventFailed(id: string, error: string): Promise<void>;
  getWebhookEvents(filter?: { status?: string; limit?: number; offset?: number }): Promise<WebhookEvent[]>;

  // Dispute (chargeback) tracking
  getDisputeByGatewayId(gateway: string, gatewayDisputeId: string): Promise<Dispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDisputeStatus(id: string, status: string, rawPayload: Record<string, unknown>): Promise<void>;
  getDisputes(filter?: { limit?: number; offset?: number }): Promise<Dispute[]>;

  // Reconciliation mismatches — findings from the daily gateway-vs-local-DB
  // comparison job. recordReconciliationMismatchIfNew returns undefined if
  // the same (gateway, gatewayPaymentId, mismatchType) is already logged
  // and open, so re-runs of the job don't spam duplicate rows for a
  // mismatch that hasn't been resolved yet.
  recordReconciliationMismatchIfNew(mismatch: InsertReconciliationMismatch): Promise<ReconciliationMismatch | undefined>;
  resolveReconciliationMismatch(id: string): Promise<void>;
  getReconciliationMismatches(filter?: { status?: string; limit?: number; offset?: number }): Promise<ReconciliationMismatch[]>;

  // Payment order operations (for Razorpay security)
  createPaymentOrder(razorpayOrderId: string, userId: string, amount: string): Promise<PaymentOrder>;
  getPaymentOrder(razorpayOrderId: string): Promise<PaymentOrder | undefined>;
  markPaymentOrderCompleted(razorpayOrderId: string, razorpayPaymentId: string): Promise<PaymentOrder | undefined>;
  
  // Feedback operations
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getApprovedTestimonials(): Promise<Feedback[]>;
  getAllFeedback(pagination?: { limit: number; offset: number }): Promise<Feedback[]>;
  updateFeedbackStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Feedback | undefined>;
  
  // Daily check-in operations
  createDailyCheckIn(checkIn: InsertDailyCheckIn): Promise<DailyCheckIn>;
  getTodayCheckIn(userId: string): Promise<DailyCheckIn | undefined>;
  getRecentCheckIns(userId: string, days?: number): Promise<DailyCheckIn[]>;
  
  // Micro-practices operations
  createMicroPractice(practice: InsertMicroPractice): Promise<MicroPractice>;
  getUserMicroPractices(userId: string, days?: number): Promise<MicroPractice[]>;
  
  // Community challenges operations
  createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge>;
  getActiveChallenges(): Promise<CommunityChallenge[]>;
  joinChallenge(challengeId: string, userId: string): Promise<ChallengeParticipant>;
  getUserChallenges(userId: string): Promise<Array<CommunityChallenge & { joined: boolean }>>;
  getChallengeParticipantCount(challengeId: string): Promise<number>;
  
  // Voice messages operations
  createVoiceMessage(message: InsertVoiceMessage): Promise<VoiceMessage>;
  getVoiceMessages(userId: string, conversationId: string): Promise<VoiceMessage[]>;

  // Crisis event operations (safety audit trail)
  createCrisisEvent(event: InsertCrisisEvent): Promise<CrisisEvent>;
  getCrisisEvents(status?: 'open' | 'reviewed' | 'resolved', pagination?: { limit: number; offset: number }): Promise<CrisisEvent[]>;
  updateCrisisEventStatus(id: string, status: 'open' | 'reviewed' | 'resolved', reviewedBy: string): Promise<CrisisEvent | undefined>;

  // Analytics (admin overview)
  getAnalyticsOverview(): Promise<AnalyticsOverview>;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalClients: number;
  totalProfessionals: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSessions: number;
  completedSessions: number;
  totalJournalEntries: number;
  totalChatMessages: number;
  totalCrisisEvents: number;
  openCrisisEvents: number;
  totalMicroPractices: number;
  totalCheckIns: number;
  signupsByDay: Array<{ date: string; count: number }>;
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

  async getUserByEmailVerificationTokenHash(hash: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationTokenHash, hash));
    return user || undefined;
  }

  async getUserByPasswordResetTokenHash(hash: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetTokenHash, hash));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async addPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    await db.insert(passwordHistory).values({ userId, passwordHash });
    // Keep only the most recent 5 — old entries have no further purpose.
    const rows = await db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));
    const staleIds = rows.slice(5).map((r) => r.id);
    for (const staleId of staleIds) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, staleId));
    }
  }

  async getRecentPasswordHashes(userId: string, limit = 5): Promise<string[]> {
    const rows = await db
      .select({ passwordHash: passwordHistory.passwordHash })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(limit);
    return rows.map((r) => r.passwordHash);
  }

  // "Delete my account" anonymizes personal data rather than hard-deleting
  // the users row. sessions/reviews/earnings reference this user without a
  // cascade FK on purpose: a client deleting their account must not wipe
  // out a professional's legitimate session/earnings history, and GDPR/DPDP
  // both allow retaining transaction records needed for other legal
  // obligations (Art 17(3) GDPR) as long as the personal data itself is
  // erased. Data with no other-party dependency is hard-deleted below.
  async anonymizeUser(userId: string): Promise<void> {
    await db.update(users).set({
      email: `deleted-${userId}@deleted.local`,
      password: null,
      fullName: "Deleted User",
      firstName: null,
      lastName: null,
      phone: null,
      gender: null,
      profileImage: null,
      emailVerified: false,
      emailVerificationTokenHash: null,
      emailVerificationExpiry: null,
      passwordResetTokenHash: null,
      passwordResetExpiry: null,
      mfaEnabled: false,
      mfaSecretEncrypted: null,
      mfaBackupCodeHashes: null,
    }).where(eq(users.id, userId));

    await db.update(professionalProfiles)
      .set({ isAvailable: false, isOnline: false, bio: null })
      .where(eq(professionalProfiles.userId, userId));

    await db.delete(journalEntries).where(eq(journalEntries.userId, userId));
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    await db.delete(voiceMessages).where(eq(voiceMessages.userId, userId));
    await db.delete(dailyCheckIns).where(eq(dailyCheckIns.userId, userId));
    await db.delete(microPractices).where(eq(microPractices.userId, userId));
    await db.delete(knownDevices).where(eq(knownDevices.userId, userId));
    await db.delete(passwordHistory).where(eq(passwordHistory.userId, userId));
  }

  // GDPR/DPDP data-portability: everything this user directly owns, in one
  // export. Excludes other people's data even where they share a session.
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [profile] = await db.select().from(professionalProfiles).where(eq(professionalProfiles.userId, userId));
    const userSessions = await db.select().from(sessions).where(sql`${sessions.clientId} = ${userId} OR ${sessions.professionalId} = ${userId}`);
    const journal = await db.select().from(journalEntries).where(eq(journalEntries.userId, userId));
    const chats = await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
    const voice = await db.select().from(voiceMessages).where(eq(voiceMessages.userId, userId));
    const checkIns = await db.select().from(dailyCheckIns).where(eq(dailyCheckIns.userId, userId));
    const practices = await db.select().from(microPractices).where(eq(microPractices.userId, userId));
    const userReviews = await db.select().from(reviews).where(sql`${reviews.clientId} = ${userId} OR ${reviews.professionalId} = ${userId}`);
    const userEarnings = await db.select().from(earnings).where(eq(earnings.professionalId, userId));

    const { password, mfaSecretEncrypted, mfaBackupCodeHashes, emailVerificationTokenHash, passwordResetTokenHash, ...safeUser } = user || {};

    return {
      exportedAt: new Date().toISOString(),
      account: safeUser,
      professionalProfile: profile || null,
      sessions: userSessions,
      journalEntries: journal,
      companionChatMessages: chats,
      voiceMessages: voice,
      dailyCheckIns: checkIns,
      microPractices: practices,
      reviews: userReviews,
      earnings: userEarnings,
    };
  }

  // Professional profile operations
  async getProfessionalProfile(userId: string): Promise<(ProfessionalProfile & { user: SafeUser }) | undefined> {
    const [result] = await db
      .select()
      .from(professionalProfiles)
      .leftJoin(users, eq(professionalProfiles.userId, users.id))
      .where(eq(professionalProfiles.userId, userId));
    if (!result || !result.users) return undefined;
    return { ...result.professional_profiles, user: sanitizeUser(result.users) };
  }

  async createProfessionalProfile(profile: InsertProfessionalProfile): Promise<ProfessionalProfile> {
    const [created] = await db
      .insert(professionalProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateProfessionalProfile(userId: string, updates: Partial<InsertProfessionalProfile>): Promise<ProfessionalProfile> {
    const [updated] = await db
      .update(professionalProfiles)
      .set(updates)
      .where(eq(professionalProfiles.userId, userId))
      .returning();
    return updated;
  }

  async updateProfessionalAvailability(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(professionalProfiles)
      .set({ isOnline })
      .where(eq(professionalProfiles.userId, userId));
  }

  async getAllProfessionals(): Promise<Array<ProfessionalProfile & { user: SafeUser; minPrice: string | null }>> {
    const results = await db
      .select({
        profile: professionalProfiles,
        user: users,
        minPrice: sql<string | null>`(
          SELECT MIN(${professionalSessionOfferings.price}) FROM ${professionalSessionOfferings}
          WHERE ${professionalSessionOfferings.professionalId} = ${professionalProfiles.userId}
            AND ${professionalSessionOfferings.enabled} = true
        )`,
      })
      .from(professionalProfiles)
      .leftJoin(users, eq(professionalProfiles.userId, users.id))
      .where(
        and(
          eq(professionalProfiles.isAvailable, true),
          sql`${professionalProfiles.suspendedAt} IS NULL`,
          // Only list professionals who've actually configured at least one
          // bookable session — otherwise "Session Starts From ₹--" is broken UI.
          sql`EXISTS (
            SELECT 1 FROM ${professionalSessionOfferings}
            WHERE ${professionalSessionOfferings.professionalId} = ${professionalProfiles.userId}
              AND ${professionalSessionOfferings.enabled} = true
          )`
        )
      );

    // BUG FIX (price mismatch between booking and call-time charge): MIN()
    // above reads the raw base price -- what the professional actually
    // receives before GST -- but this minPrice is shown to clients as
    // "Session Starts From ₹X" before they've even opened a booking flow.
    // Run it through the same computeBreakdownFromBase() the backend uses to
    // lock priceAtBooking, so this figure is never lower than what a client
    // will actually be charged.
    return results.map((r) => ({
      ...r.profile,
      user: sanitizeUser(r.user!),
      minPrice: r.minPrice != null ? computeBreakdownFromBase(r.minPrice).total : null,
    }));
  }

  async suspendProfessional(userId: string, reason: string): Promise<void> {
    await db
      .update(professionalProfiles)
      .set({ suspendedAt: new Date(), suspendedReason: reason, isAvailable: false })
      .where(eq(professionalProfiles.userId, userId));
  }

  async reactivateProfessional(userId: string): Promise<void> {
    await db
      .update(professionalProfiles)
      .set({ suspendedAt: null, suspendedReason: null })
      .where(eq(professionalProfiles.userId, userId));
  }

  // Session templates (fixed catalog, seeded by migration — read-only here)
  async getSessionTemplates(): Promise<SessionTemplate[]> {
    return await db
      .select()
      .from(sessionTemplates)
      .where(eq(sessionTemplates.isActive, true))
      .orderBy(sessionTemplates.sortOrder);
  }

  async getSessionTemplate(id: string): Promise<SessionTemplate | undefined> {
    const [template] = await db.select().from(sessionTemplates).where(eq(sessionTemplates.id, id));
    return template || undefined;
  }

  // Professional session offerings
  async getProfessionalOfferings(professionalId: string): Promise<ProfessionalSessionOffering[]> {
    return await db
      .select()
      .from(professionalSessionOfferings)
      .where(eq(professionalSessionOfferings.professionalId, professionalId));
  }

  async upsertProfessionalOffering(input: InsertProfessionalSessionOffering): Promise<ProfessionalSessionOffering> {
    const [row] = await db
      .insert(professionalSessionOfferings)
      .values(input)
      .onConflictDoUpdate({
        target: [
          professionalSessionOfferings.professionalId,
          professionalSessionOfferings.consultationType,
          professionalSessionOfferings.sessionTemplateId,
        ],
        set: { price: input.price, enabled: input.enabled, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async getOffering(
    professionalId: string,
    consultationType: string,
    sessionTemplateId: string
  ): Promise<ProfessionalSessionOffering | undefined> {
    const [row] = await db
      .select()
      .from(professionalSessionOfferings)
      .where(
        and(
          eq(professionalSessionOfferings.professionalId, professionalId),
          eq(professionalSessionOfferings.consultationType, consultationType),
          eq(professionalSessionOfferings.sessionTemplateId, sessionTemplateId),
          eq(professionalSessionOfferings.enabled, true)
        )
      );
    return row || undefined;
  }

  async getMinPriceForProfessional(professionalId: string): Promise<string | null> {
    const [row] = await db
      .select({ minPrice: sql<string>`MIN(${professionalSessionOfferings.price})` })
      .from(professionalSessionOfferings)
      .where(
        and(
          eq(professionalSessionOfferings.professionalId, professionalId),
          eq(professionalSessionOfferings.enabled, true)
        )
      );
    return row?.minPrice ?? null;
  }

  async professionalHasAnyEnabledOffering(professionalId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: professionalSessionOfferings.id })
      .from(professionalSessionOfferings)
      .where(
        and(
          eq(professionalSessionOfferings.professionalId, professionalId),
          eq(professionalSessionOfferings.enabled, true)
        )
      )
      .limit(1);
    return !!row;
  }

  // Working hours & leave
  async getProfessionalAvailability(professionalId: string): Promise<ProfessionalAvailabilityRow[]> {
    return await db
      .select()
      .from(professionalAvailability)
      .where(eq(professionalAvailability.professionalId, professionalId))
      .orderBy(professionalAvailability.dayOfWeek);
  }

  async setProfessionalAvailability(input: InsertProfessionalAvailability): Promise<ProfessionalAvailabilityRow> {
    const [row] = await db
      .insert(professionalAvailability)
      .values(input)
      .onConflictDoUpdate({
        target: [professionalAvailability.professionalId, professionalAvailability.dayOfWeek],
        set: { startTime: input.startTime, endTime: input.endTime, enabled: input.enabled },
      })
      .returning();
    return row;
  }

  async deleteProfessionalAvailability(professionalId: string, dayOfWeek: number): Promise<void> {
    await db
      .delete(professionalAvailability)
      .where(
        and(
          eq(professionalAvailability.professionalId, professionalId),
          eq(professionalAvailability.dayOfWeek, dayOfWeek)
        )
      );
  }

  async getProfessionalLeave(professionalId: string): Promise<ProfessionalLeave[]> {
    return await db
      .select()
      .from(professionalLeave)
      .where(eq(professionalLeave.professionalId, professionalId))
      .orderBy(desc(professionalLeave.startDate));
  }

  async createProfessionalLeave(leave: InsertProfessionalLeave): Promise<ProfessionalLeave> {
    const [row] = await db.insert(professionalLeave).values(leave).returning();
    return row;
  }

  async deleteProfessionalLeave(id: string, professionalId: string): Promise<void> {
    await db
      .delete(professionalLeave)
      .where(and(eq(professionalLeave.id, id), eq(professionalLeave.professionalId, professionalId)));
  }

  async getConflictingSessions(professionalId: string, startDate: Date, endDate: Date): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.professionalId, professionalId),
          gte(sessions.scheduledAt, startDate),
          lte(sessions.scheduledAt, endDate),
          sql`${sessions.status} NOT IN ('cancelled', 'completed')`
        )
      );
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

  async creditWalletForGatewayPayment(params: {
    userId: string;
    amount: string;
    description: string;
    stripePaymentId?: string;
    razorpayPaymentId?: string;
  }): Promise<{ credited: boolean; wallet?: Wallet }> {
    return await db.transaction(async (tx) => {
      let [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, params.userId)).for("update");
      if (!wallet) {
        [wallet] = await tx.insert(wallets).values({ userId: params.userId, balance: "0", totalRecharged: "0" }).returning();
      }

      try {
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: "recharge",
          amount: params.amount,
          description: params.description,
          stripePaymentId: params.stripePaymentId,
          razorpayPaymentId: params.razorpayPaymentId,
        });
      } catch (err: any) {
        if (isUniqueViolation(err)) {
          // Already credited by a previous delivery of this same payment.
          return { credited: false };
        }
        throw err;
      }

      const [updated] = await tx
        .update(wallets)
        .set({ balance: money.add(wallet.balance, params.amount), updatedAt: new Date() })
        .where(eq(wallets.id, wallet.id))
        .returning();
      return { credited: true, wallet: updated };
    });
  }

  async getWalletTransactionByStripePaymentId(stripePaymentId: string): Promise<WalletTransaction | undefined> {
    const [txn] = await db.select().from(walletTransactions).where(eq(walletTransactions.stripePaymentId, stripePaymentId));
    return txn || undefined;
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

  async getProfessionalUpcomingSessions(professionalId: string): Promise<Array<Session & { client: SafeUser }>> {
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
      client: sanitizeUser(r.users!),
    }));
  }

  // Pending instant-session requests still awaiting accept/decline — a REST
  // fallback for the dashboard's incoming-requests card, which previously
  // relied entirely on catching a live WS broadcast at the exact moment a
  // request came in. A professional who wasn't already connected (page not
  // open yet, brief reconnect, etc.) would otherwise never see it, even
  // after refreshing, since a fresh WS connection only gets *future* events.
  async getProfessionalPendingRequests(professionalId: string): Promise<Array<Session & { client: SafeUser }>> {
    const results = await db
      .select()
      .from(sessions)
      .leftJoin(users, eq(sessions.clientId, users.id))
      .where(
        and(
          eq(sessions.professionalId, professionalId),
          eq(sessions.status, 'pending'),
          eq(sessions.mode, 'instant')
        )
      )
      .orderBy(desc(sessions.scheduledAt));

    return results.map((r) => ({
      ...r.sessions,
      client: sanitizeUser(r.users!),
    }));
  }

  async getAllProfessionalSessions(professionalId: string): Promise<Array<Session & { client: SafeUser }>> {
    const results = await db
      .select()
      .from(sessions)
      .leftJoin(users, eq(sessions.clientId, users.id))
      .where(eq(sessions.professionalId, professionalId))
      .orderBy(desc(sessions.scheduledAt));

    return results.map((r) => ({
      ...r.sessions,
      client: sanitizeUser(r.users!),
    }));
  }

  async getExpiredInstantRequests(): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.mode, "instant"),
          eq(sessions.status, "pending"),
          sql`${sessions.respondBy} IS NOT NULL AND ${sessions.respondBy} < now()`
        )
      );
  }

  async getSimilarOnlineProfessionals(
    excludeProfessionalId: string,
    consultationType: string,
    sessionTemplateId: string
  ): Promise<Array<{ id: string; fullName: string | null; specialization: string; profileImage: string | null }>> {
    const [rejected] = await db.select().from(professionalProfiles).where(eq(professionalProfiles.userId, excludeProfessionalId));
    if (!rejected) return [];

    const results = await db
      .select({
        id: professionalProfiles.userId,
        fullName: users.fullName,
        specialization: professionalProfiles.specialization,
        profileImage: users.profileImage,
      })
      .from(professionalProfiles)
      .innerJoin(users, eq(professionalProfiles.userId, users.id))
      .innerJoin(
        professionalSessionOfferings,
        and(
          eq(professionalSessionOfferings.professionalId, professionalProfiles.userId),
          eq(professionalSessionOfferings.consultationType, consultationType),
          eq(professionalSessionOfferings.sessionTemplateId, sessionTemplateId),
          eq(professionalSessionOfferings.enabled, true)
        )
      )
      .where(
        and(
          eq(professionalProfiles.isOnline, true),
          eq(professionalProfiles.isAvailable, true),
          sql`${professionalProfiles.suspendedAt} IS NULL`,
          eq(professionalProfiles.specialization, rejected.specialization),
          sql`${professionalProfiles.userId} != ${excludeProfessionalId}`
        )
      )
      .limit(5);

    return results;
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

  async getReviewBySessionId(sessionId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.sessionId, sessionId));
    return review || undefined;
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

  // Session chat operations
  async createSessionMessage(message: InsertSessionMessage): Promise<SessionMessage> {
    const [created] = await db.insert(sessionMessages).values(message).returning();
    return created;
  }

  async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    return await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId))
      .orderBy(sessionMessages.createdAt);
  }

  async recordWebhookEventIfNew(event: InsertWebhookEvent): Promise<WebhookEvent | undefined> {
    try {
      const [created] = await db.insert(webhookEvents).values(event).returning();
      return created;
    } catch (err: any) {
      if (isUniqueViolation(err)) return undefined; // (gateway, eventId) already logged
      throw err;
    }
  }

  async markWebhookEventProcessed(id: string): Promise<void> {
    await db.update(webhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(webhookEvents.id, id));
  }

  async markWebhookEventFailed(id: string, error: string): Promise<void> {
    await db.update(webhookEvents).set({ status: "failed", error, processedAt: new Date() }).where(eq(webhookEvents.id, id));
  }

  async getWebhookEvents(filter?: { status?: string; limit?: number; offset?: number }): Promise<WebhookEvent[]> {
    const limit = Math.min(filter?.limit ?? 50, 200);
    const offset = filter?.offset ?? 0;
    const query = filter?.status
      ? db.select().from(webhookEvents).where(eq(webhookEvents.status, filter.status)).orderBy(desc(webhookEvents.receivedAt))
      : db.select().from(webhookEvents).orderBy(desc(webhookEvents.receivedAt));
    return await query.limit(limit).offset(offset);
  }

  async getDisputeByGatewayId(gateway: string, gatewayDisputeId: string): Promise<Dispute | undefined> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(and(eq(disputes.gateway, gateway), eq(disputes.gatewayDisputeId, gatewayDisputeId)));
    return dispute || undefined;
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [created] = await db.insert(disputes).values(dispute).returning();
    return created;
  }

  async updateDisputeStatus(id: string, status: string, rawPayload: Record<string, unknown>): Promise<void> {
    await db.update(disputes).set({ status, rawPayload, updatedAt: new Date() }).where(eq(disputes.id, id));
  }

  async getDisputes(filter?: { limit?: number; offset?: number }): Promise<Dispute[]> {
    const limit = Math.min(filter?.limit ?? 50, 200);
    const offset = filter?.offset ?? 0;
    return await db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(limit).offset(offset);
  }

  async recordReconciliationMismatchIfNew(mismatch: InsertReconciliationMismatch): Promise<ReconciliationMismatch | undefined> {
    // The unique index is on (gateway, gatewayPaymentId, mismatchType) with
    // no status column, so a mismatch that was resolved and later recurs
    // would otherwise hit the constraint and be silently dropped. Re-open
    // the existing row in that case instead of treating it as a duplicate.
    const [existing] = await db
      .select()
      .from(reconciliationMismatches)
      .where(and(
        eq(reconciliationMismatches.gateway, mismatch.gateway),
        eq(reconciliationMismatches.gatewayPaymentId, mismatch.gatewayPaymentId),
        eq(reconciliationMismatches.mismatchType, mismatch.mismatchType),
      ));
    if (existing) {
      if (existing.status !== "resolved") return undefined; // already logged and still open
      const [reopened] = await db
        .update(reconciliationMismatches)
        .set({
          status: "open",
          gatewayStatus: mismatch.gatewayStatus,
          localStatus: mismatch.localStatus,
          amount: mismatch.amount,
          details: mismatch.details,
          resolvedAt: null,
          createdAt: new Date(),
        })
        .where(eq(reconciliationMismatches.id, existing.id))
        .returning();
      return reopened;
    }
    try {
      const [created] = await db.insert(reconciliationMismatches).values(mismatch).returning();
      return created;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) return undefined; // lost a concurrent-insert race
      throw err;
    }
  }

  async resolveReconciliationMismatch(id: string): Promise<void> {
    await db.update(reconciliationMismatches).set({ status: "resolved", resolvedAt: new Date() }).where(eq(reconciliationMismatches.id, id));
  }

  async getReconciliationMismatches(filter?: { status?: string; limit?: number; offset?: number }): Promise<ReconciliationMismatch[]> {
    const limit = Math.min(filter?.limit ?? 50, 200);
    const offset = filter?.offset ?? 0;
    const query = filter?.status
      ? db.select().from(reconciliationMismatches).where(eq(reconciliationMismatches.status, filter.status)).orderBy(desc(reconciliationMismatches.createdAt))
      : db.select().from(reconciliationMismatches).orderBy(desc(reconciliationMismatches.createdAt));
    return await query.limit(limit).offset(offset);
  }

  // Payment order operations (for Razorpay security)
  async createPaymentOrder(razorpayOrderId: string, userId: string, amount: string): Promise<PaymentOrder> {
    const [order] = await db.insert(paymentOrders).values({
      razorpayOrderId,
      userId,
      amount,
      status: "pending",
    }).returning();
    return order;
  }

  async getPaymentOrder(razorpayOrderId: string): Promise<PaymentOrder | undefined> {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.razorpayOrderId, razorpayOrderId));
    return order || undefined;
  }

  async markPaymentOrderCompleted(razorpayOrderId: string, razorpayPaymentId: string): Promise<PaymentOrder | undefined> {
    const [updated] = await db
      .update(paymentOrders)
      .set({
        status: "completed",
        razorpayPaymentId,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(paymentOrders.razorpayOrderId, razorpayOrderId),
          eq(paymentOrders.status, "pending")
        )
      )
      .returning();
    return updated || undefined;
  }


  // Feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values({
      ...feedbackData,
      status: "pending",
    }).returning();
    return created;
  }

  async getApprovedTestimonials(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.status, "approved"),
          eq(feedback.showOnHomepage, true)
        )
      )
      .orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(pagination?: { limit: number; offset: number }): Promise<Feedback[]> {
    const query = db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
    if (pagination) return await query.limit(pagination.limit).offset(pagination.offset);
    return await query;
  }

  async updateFeedbackStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Feedback | undefined> {
    const [updated] = await db
      .update(feedback)
      .set({ status })
      .where(eq(feedback.id, id))
      .returning();
    return updated || undefined;
  }

  // Crisis event operations (safety audit trail)
  async createCrisisEvent(event: InsertCrisisEvent): Promise<CrisisEvent> {
    const [created] = await db.insert(crisisEvents).values(event).returning();
    return created;
  }

  async getCrisisEvents(status?: 'open' | 'reviewed' | 'resolved', pagination?: { limit: number; offset: number }): Promise<CrisisEvent[]> {
    const query = status
      ? db.select().from(crisisEvents).where(eq(crisisEvents.status, status)).orderBy(desc(crisisEvents.createdAt))
      : db.select().from(crisisEvents).orderBy(desc(crisisEvents.createdAt));
    if (pagination) return await query.limit(pagination.limit).offset(pagination.offset);
    return await query;
  }

  async updateCrisisEventStatus(id: string, status: 'open' | 'reviewed' | 'resolved', reviewedBy: string): Promise<CrisisEvent | undefined> {
    const [updated] = await db
      .update(crisisEvents)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(crisisEvents.id, id))
      .returning();
    return updated || undefined;
  }

  // Analytics (admin overview)
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const [userStats] = await db.select({
      total: sql<number>`COUNT(*)::integer`,
      clients: sql<number>`COUNT(*) FILTER (WHERE role = 'client')::integer`,
      professionals: sql<number>`COUNT(*) FILTER (WHERE role = 'professional')::integer`,
      last7Days: sql<number>`COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer`,
      last30Days: sql<number>`COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::integer`,
    }).from(users);

    const [sessionStats] = await db.select({
      total: sql<number>`COUNT(*)::integer`,
      completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')::integer`,
    }).from(sessions);

    const [journalStats] = await db.select({ total: sql<number>`COUNT(*)::integer` }).from(journalEntries);
    const [chatStats] = await db.select({ total: sql<number>`COUNT(*)::integer` }).from(chatMessages);
    const [practiceStats] = await db.select({ total: sql<number>`COUNT(*)::integer` }).from(microPractices);
    const [checkInStats] = await db.select({ total: sql<number>`COUNT(*)::integer` }).from(dailyCheckIns);

    const [crisisStats] = await db.select({
      total: sql<number>`COUNT(*)::integer`,
      open: sql<number>`COUNT(*) FILTER (WHERE status = 'open')::integer`,
    }).from(crisisEvents);

    const signupsByDay = await db.select({
      date: sql<string>`DATE(created_at)::text`,
      count: sql<number>`COUNT(*)::integer`,
    }).from(users)
      .where(sql`created_at >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return {
      totalUsers: userStats?.total || 0,
      totalClients: userStats?.clients || 0,
      totalProfessionals: userStats?.professionals || 0,
      newUsersLast7Days: userStats?.last7Days || 0,
      newUsersLast30Days: userStats?.last30Days || 0,
      totalSessions: sessionStats?.total || 0,
      completedSessions: sessionStats?.completed || 0,
      totalJournalEntries: journalStats?.total || 0,
      totalChatMessages: chatStats?.total || 0,
      totalCrisisEvents: crisisStats?.total || 0,
      openCrisisEvents: crisisStats?.open || 0,
      totalMicroPractices: practiceStats?.total || 0,
      totalCheckIns: checkInStats?.total || 0,
      signupsByDay,
    };
  }

  // Daily check-in operations
  async createDailyCheckIn(checkIn: InsertDailyCheckIn): Promise<DailyCheckIn> {
    const [created] = await db.insert(dailyCheckIns).values(checkIn).returning();
    return created;
  }

  async getTodayCheckIn(userId: string): Promise<DailyCheckIn | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [checkIn] = await db
      .select()
      .from(dailyCheckIns)
      .where(
        and(
          eq(dailyCheckIns.userId, userId),
          gte(dailyCheckIns.checkInDate, today),
          lte(dailyCheckIns.checkInDate, tomorrow)
        )
      )
      .limit(1);
    return checkIn || undefined;
  }

  async getRecentCheckIns(userId: string, days: number = 7): Promise<DailyCheckIn[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(dailyCheckIns)
      .where(
        and(
          eq(dailyCheckIns.userId, userId),
          gte(dailyCheckIns.checkInDate, startDate)
        )
      )
      .orderBy(desc(dailyCheckIns.checkInDate));
  }

  // Micro-practices operations
  async createMicroPractice(practice: InsertMicroPractice): Promise<MicroPractice> {
    const [created] = await db.insert(microPractices).values(practice).returning();
    return created;
  }

  async getUserMicroPractices(userId: string, days: number = 30): Promise<MicroPractice[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(microPractices)
      .where(
        and(
          eq(microPractices.userId, userId),
          gte(microPractices.completedAt, startDate)
        )
      )
      .orderBy(desc(microPractices.completedAt));
  }

  // Community challenges operations
  async createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge> {
    const [created] = await db.insert(communityChallenges).values(challenge).returning();
    return created;
  }

  async getActiveChallenges(): Promise<CommunityChallenge[]> {
    const now = new Date();
    return await db
      .select()
      .from(communityChallenges)
      .where(
        and(
          eq(communityChallenges.isActive, true),
          lte(communityChallenges.startDate, now),
          gte(communityChallenges.endDate, now)
        )
      )
      .orderBy(desc(communityChallenges.startDate));
  }

  async joinChallenge(challengeId: string, userId: string): Promise<ChallengeParticipant> {
    // Check if already joined
    const [existing] = await db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Join challenge
    const [participant] = await db
      .insert(challengeParticipants)
      .values({ challengeId, userId })
      .returning();

    // Update participant count (anonymous)
    await db
      .update(communityChallenges)
      .set({
        participantCount: sql`${communityChallenges.participantCount} + 1`,
      })
      .where(eq(communityChallenges.id, challengeId));

    return participant;
  }

  async getUserChallenges(userId: string): Promise<Array<CommunityChallenge & { joined: boolean }>> {
    const challenges = await this.getActiveChallenges();
    const userParticipations = await db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.userId, userId));

    const joinedIds = new Set(userParticipations.map(p => p.challengeId));

    return challenges.map(challenge => ({
      ...challenge,
      joined: joinedIds.has(challenge.id),
    }));
  }

  async getChallengeParticipantCount(challengeId: string): Promise<number> {
    const [result] = await db
      .select({
        count: sql<number>`COUNT(*)::integer`,
      })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));
    return result?.count || 0;
  }

  // Voice messages operations
  async createVoiceMessage(message: InsertVoiceMessage): Promise<VoiceMessage> {
    const [created] = await db.insert(voiceMessages).values(message).returning();
    return created;
  }

  async getVoiceMessages(userId: string, conversationId: string): Promise<VoiceMessage[]> {
    return await db
      .select()
      .from(voiceMessages)
      .where(
        and(
          eq(voiceMessages.userId, userId),
          eq(voiceMessages.conversationId, conversationId)
        )
      )
      .orderBy(desc(voiceMessages.createdAt));
  }

  // Professional application (verification) operations
  async createProfessionalApplication(
    application: InsertProfessionalApplication & { userId: string; documents: unknown[] }
  ): Promise<ProfessionalApplication> {
    const [created] = await db.insert(professionalApplications).values(application).returning();
    return created;
  }

  async getProfessionalApplication(id: string): Promise<ProfessionalApplication | undefined> {
    const [app] = await db.select().from(professionalApplications).where(eq(professionalApplications.id, id));
    return app || undefined;
  }

  async getUserLatestApplication(userId: string): Promise<ProfessionalApplication | undefined> {
    const [app] = await db
      .select()
      .from(professionalApplications)
      .where(eq(professionalApplications.userId, userId))
      .orderBy(desc(professionalApplications.createdAt))
      .limit(1);
    return app || undefined;
  }

  async hasPendingOrApprovedApplication(userId: string): Promise<boolean> {
    const [app] = await db
      .select({ id: professionalApplications.id })
      .from(professionalApplications)
      .where(
        and(
          eq(professionalApplications.userId, userId),
          sql`${professionalApplications.status} IN ('pending', 'approved')`
        )
      )
      .limit(1);
    return !!app;
  }

  async getApplicationsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Array<ProfessionalApplication & { applicant: SafeUser; suspended?: boolean }>> {
    const results = await db
      .select()
      .from(professionalApplications)
      .leftJoin(users, eq(professionalApplications.userId, users.id))
      .leftJoin(professionalProfiles, eq(professionalApplications.userId, professionalProfiles.userId))
      .where(eq(professionalApplications.status, status))
      .orderBy(desc(professionalApplications.createdAt));

    return results.map((r) => ({
      ...r.professional_applications,
      applicant: sanitizeUser(r.users!),
      // Only meaningful for status === 'approved' — an approved application's
      // professional_profiles row can later be suspended by an admin, and
      // the review UI needs to show that without a separate request.
      suspended: !!r.professional_profiles?.suspendedAt,
    }));
  }

  // Approval is one atomic transaction: the application record, the user's
  // role, and the new professional profile all change together or not at
  // all — a partial failure here must never leave a 'professional' role
  // dangling with no profile, or vice versa.
  async approveProfessionalApplication(id: string, reviewerId: string): Promise<ProfessionalApplication> {
    return await db.transaction(async (tx) => {
      const [application] = await tx
        .select()
        .from(professionalApplications)
        .where(eq(professionalApplications.id, id));

      if (!application) {
        throw new Error("Application not found");
      }
      if (application.status !== 'pending') {
        throw new Error("Application has already been reviewed");
      }

      const [updated] = await tx
        .update(professionalApplications)
        .set({ status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() })
        .where(eq(professionalApplications.id, id))
        .returning();

      await tx.update(users).set({ role: 'professional' }).where(eq(users.id, application.userId));

      await tx.insert(professionalProfiles).values({
        userId: application.userId,
        specialization: application.specialization,
        qualification: application.qualification,
        experience: application.experience,
        bio: application.bio,
        languages: application.languages,
        pricePerMinute: application.pricePerMinute,
        licenseNumber: application.licenseNumber,
      });

      return updated;
    });
  }

  async rejectProfessionalApplication(id: string, reviewerId: string, reason: string): Promise<ProfessionalApplication> {
    const [application] = await db.select().from(professionalApplications).where(eq(professionalApplications.id, id));
    if (!application) {
      throw new Error("Application not found");
    }
    if (application.status !== 'pending') {
      throw new Error("Application has already been reviewed");
    }

    const [updated] = await db
      .update(professionalApplications)
      .set({ status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: reason })
      .where(eq(professionalApplications.id, id))
      .returning();
    return updated;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getUserNotifications(userId: string, limit = 30): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)::integer` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
