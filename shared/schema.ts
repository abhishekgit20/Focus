import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table used by connect-pg-simple (see server/auth.ts) - don't drop it.
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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  role: text("role").notNull().default("client"), // 'client' | 'professional' | 'admin' | 'super_admin'
  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  gender: text("gender"), // 'male', 'female', or 'other'
  profileImage: text("profile_image"),

  // Email verification
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationTokenHash: text("email_verification_token_hash"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),

  // Password reset (raw token is emailed, only its hash is ever stored)
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  lastPasswordChangeAt: timestamp("last_password_change_at").defaultNow(),

  // Brute-force / account lockout
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),

  // MFA (TOTP). Secret and backup codes are encrypted/hashed at rest — see
  // server/security/encryption.ts and server/security/mfa.ts.
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecretEncrypted: text("mfa_secret_encrypted"),
  mfaBackupCodeHashes: text("mfa_backup_code_hashes").array(),
  // Absolute 30s time-step of the last TOTP code accepted for this user —
  // blocks replaying an intercepted-but-still-valid code a second time
  // within its ~30-90s window (otplib's default verify() allows ±1 step of
  // drift, so a code stays "valid" for a short time after first use).
  mfaLastUsedStep: integer("mfa_last_used_step"),

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
  // Deprecated — replaced by professionalSessionOfferings (fixed-duration
  // session templates priced per consultation type). Nullable and unused by
  // any code path; kept as a column for one release as a rollback safety net.
  pricePerMinute: decimal("price_per_minute", { precision: 10, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  licenseNumber: text("license_number"),

  // Seconds an instant-session request stays pending before it auto-times-out.
  instantSessionTimeoutSeconds: integer("instant_session_timeout_seconds").notNull().default(60),

  // Admin-imposed suspension — distinct from isAvailable, which is the
  // professional's own "taking clients right now" toggle. A suspended
  // professional is hidden from discovery regardless of isAvailable.
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
});

// Fixed-duration session catalog (15/30/45/60/90 min). Global, not
// per-professional — professionals opt in per consultation type via
// professionalSessionOfferings rather than defining their own durations.
export const sessionTemplates = pgTable("session_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-professional, per-consultation-type pricing for each session template.
// A consultation type (chat/audio/video) is considered "offered" iff it has
// at least one enabled row here — there is no separate enable/disable flag
// to keep in sync.
export const professionalSessionOfferings = pgTable("professional_session_offerings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consultationType: text("consultation_type").notNull(), // 'chat' | 'audio' | 'video'
  sessionTemplateId: varchar("session_template_id").notNull().references(() => sessionTemplates.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("UQ_offerings_prof_type_template").on(table.professionalId, table.consultationType, table.sessionTemplateId),
  index("IDX_offerings_professional_id").on(table.professionalId),
  index("IDX_offerings_enabled").on(table.enabled),
]);

// Weekly recurring working hours. Absence of a row for a given day means
// the professional doesn't take scheduled bookings that day.
export const professionalAvailability = pgTable("professional_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday .. 6 = Saturday
  startTime: text("start_time").notNull(), // 'HH:MM', 24h
  endTime: text("end_time").notNull(),
  enabled: boolean("enabled").notNull().default(true),
}, (table) => [
  uniqueIndex("UQ_availability_prof_day").on(table.professionalId, table.dayOfWeek),
  index("IDX_availability_professional_id").on(table.professionalId),
]);

// Blackout date ranges (leave/PTO) — replaces the previously UI-only,
// unpersisted "Schedule Break" modal.
export const professionalLeave = pgTable("professional_leave", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_leave_professional_id").on(table.professionalId),
]);

// Wallet system for clients
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRecharged: decimal("total_recharged", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions. amount is always stored positive; direction is
// implied by type — recharge/refund/promo_credit/referral_bonus/cashback/
// gift_card credit the wallet, 'payment' debits it. Wallet is now optional
// at booking time (Pay Now via Razorpay is the default) — the wallet's role
// is refunds, promo credits, referral bonuses, cashback, manual recharge,
// and gift cards, per the payment-system redesign.
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'recharge'|'payment'|'refund'|'promo_credit'|'referral_bonus'|'cashback'|'gift_card'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  sessionId: varchar("session_id"), // loose reference to sessions.id if payment/refund — not a real FK, see bookingPayments
  stripePaymentId: text("stripe_payment_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  metadata: jsonb("metadata"), // e.g. { promoCode, giftCardCode, referralUserId } — forward-compat, no new columns needed later
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_wallet_transactions_wallet_id").on(table.walletId),
  index("IDX_wallet_transactions_created_at").on(table.createdAt),
  index("IDX_wallet_transactions_session_id").on(table.sessionId),
  // Stripe/Razorpay webhooks and client-confirm callbacks can fire more than
  // once for the same real payment (retries, dual events) — these constraints
  // are what makes crediting the wallet idempotent, not just the app-level
  // pre-check. NULLs don't conflict with each other, so non-Stripe/Razorpay
  // transactions (refunds, promo credits, etc.) are unaffected.
  uniqueIndex("UQ_wallet_transactions_stripe_payment_id").on(table.stripePaymentId),
  uniqueIndex("UQ_wallet_transactions_razorpay_payment_id").on(table.razorpayPaymentId),
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

// Bookings (the "sessions" name predates this booking-system redesign but
// this table IS the booking record — kept rather than split into a parallel
// `bookings` table to avoid fracturing existing FKs/WS-room keys).
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  professionalId: varchar("professional_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"), // actual elapsed duration, set on completion
  // 'payment_pending' (slot reserved, awaiting payment) -> 'pending' (instant: awaiting professional
  // accept/reject) | 'scheduled' (confirmed) -> 'in_progress' -> 'completed' | 'cancelled'
  status: text("status").notNull().default("scheduled"),
  type: text("type").notNull(), // 'video', 'audio', 'chat' — consultation type; UI labels 'audio' as "Voice"
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }), // final settled amount
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  mode: text("mode").notNull().default("scheduled"), // 'instant' | 'scheduled'
  sessionTemplateId: varchar("session_template_id").references(() => sessionTemplates.id),
  plannedDurationMinutes: integer("planned_duration_minutes"), // purchased duration, from the template
  priceAtBooking: decimal("price_at_booking", { precision: 10, scale: 2 }), // server-computed total, locked at reservation time
  respondBy: timestamp("respond_by"), // instant-session accept/reject deadline
}, (table) => [
  index("IDX_sessions_client_id").on(table.clientId),
  index("IDX_sessions_professional_id").on(table.professionalId),
  index("IDX_sessions_scheduled_at").on(table.scheduledAt),
  index("IDX_sessions_status").on(table.status),
  index("IDX_sessions_respond_by").on(table.respondBy),
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
  // Session billing finalization (server/realtime.ts finalizeSessionBilling)
  // guards against double-firing via an in-process Map + session.status
  // check, not a DB transaction — safe for a single server instance, not
  // provably safe across a restart mid-grace-period or multiple instances.
  // This is the DB-level backstop against a professional being paid twice
  // for the same session.
  uniqueIndex("UQ_earnings_session_id").on(table.sessionId),
]);

// One row per gateway (Razorpay/Stripe) payment attempt for a booking.
// Deliberately separate from paymentOrders, which stays wallet-top-up-only.
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // payer — no cascade, financial record must outlive account deletion
  sessionId: varchar("session_id").notNull().references(() => sessions.id),

  gateway: text("gateway").notNull().default("razorpay"), // 'razorpay' | 'stripe'
  gatewayOrderId: text("gateway_order_id").notNull(),
  gatewayPaymentId: text("gateway_payment_id"), // set only on verified capture

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // gateway-charged portion only
  plannedWalletPortion: decimal("planned_wallet_portion", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),

  status: text("status").notNull().default("created"), // 'created'|'authorized'|'captured'|'failed'|'refunded'|'partially_refunded'
  method: text("method"), // 'upi' | 'card' | 'netbanking' | 'wallet' (razorpay-native, not Focus wallet)
  signatureVerifiedAt: timestamp("signature_verified_at"), // a booking must never be marked paid while this is null
  failureReason: text("failure_reason"),
  rawGatewayResponse: jsonb("raw_gateway_response"), // verified gateway payload only — never raw card data

  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_payments_session_id").on(table.sessionId),
  index("IDX_payments_user_id").on(table.userId),
  index("IDX_payments_status").on(table.status),
  uniqueIndex("UQ_payments_gateway_order_id").on(table.gatewayOrderId),
  uniqueIndex("UQ_payments_gateway_payment_id").on(table.gatewayPaymentId),
  uniqueIndex("UQ_payments_idempotency_key").on(table.idempotencyKey),
]);

// The funding-source ledger for a booking — this is the split-payment
// mechanism. A booking has 1-2 rows here (wallet leg and/or gateway leg).
export const bookingPayments = pgTable("booking_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),

  fundingSourceType: text("funding_source_type").notNull(), // 'wallet' | 'gateway' | 'package_credit' (future)
  // Loose reference, not a real FK (mirrors the existing walletTransactions.sessionId precedent) — this
  // is what lets a future funding source (e.g. session packages) plug in without a schema migration.
  // Interpreted by fundingSourceType: 'wallet' -> walletTransactions.id, 'gateway' -> payments.id,
  // 'package_credit' -> a future package_credits.id.
  fundingSourceId: varchar("funding_source_id").notNull(),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // portion of the booking this source covers
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"), // 'pending'|'succeeded'|'failed'|'refunded'|'partially_refunded'

  // Price breakdown, snapshotted onto every funding leg of the same booking.
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  platformCommissionAmount: decimal("platform_commission_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalBookingAmount: decimal("total_booking_amount", { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_booking_payments_session_id").on(table.sessionId),
  index("IDX_booking_payments_funding_source").on(table.fundingSourceType, table.fundingSourceId),
  index("IDX_booking_payments_status").on(table.status),
]);

export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  bookingPaymentId: varchar("booking_payment_id").notNull().references(() => bookingPayments.id),
  fundingSourceType: text("funding_source_type").notNull(), // denormalized copy, avoids a join for common queries

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  // 'professional_rejected' | 'professional_timeout' | 'client_cancelled_within_window' |
  // 'admin_manual' | 'payment_captured_but_booking_unconfirmable'

  initiatedBy: varchar("initiated_by").references(() => users.id), // null = system (auto reject/timeout sweep)
  status: text("status").notNull().default("pending"), // 'pending'|'processing'|'succeeded'|'failed'

  destination: text("destination").notNull(), // 'source' (real gateway refund) | 'wallet' (wallet credit)
  gatewayRefundId: text("gateway_refund_id"), // only for destination='source'
  walletTransactionId: varchar("wallet_transaction_id").references(() => walletTransactions.id), // only for destination='wallet'

  idempotencyKey: text("idempotency_key").notNull(), // deterministic for auto path: auto_refund:{sessionId}:{bookingPaymentId}
  failureReason: text("failure_reason"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_refunds_session_id").on(table.sessionId),
  index("IDX_refunds_booking_payment_id").on(table.bookingPaymentId),
  index("IDX_refunds_status").on(table.status),
  uniqueIndex("UQ_refunds_idempotency_key").on(table.idempotencyKey),
  uniqueIndex("UQ_refunds_gateway_refund_id").on(table.gatewayRefundId),
]);

// Chargebacks/disputes raised by the cardholder's bank, not the client
// through our own cancel/refund flow. Not automated end-to-end (no
// auto-refund, no auto-suspend) — this table + the admin alert email it
// triggers exist so a dispute is a visible, queryable row and a human finds
// out, instead of a webhook that gets a 200 and is never looked at again.
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: text("gateway").notNull(), // 'stripe' | 'razorpay'
  gatewayDisputeId: text("gateway_dispute_id").notNull(),
  gatewayPaymentId: text("gateway_payment_id"),
  sessionId: varchar("session_id").references(() => sessions.id),
  reason: text("reason"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  status: text("status").notNull(), // gateway's own status string, e.g. 'needs_response' | 'won' | 'lost'
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("UQ_disputes_gateway_dispute_id").on(table.gateway, table.gatewayDisputeId),
  index("IDX_disputes_session_id").on(table.sessionId),
  index("IDX_disputes_status").on(table.status),
]);

// Findings from the daily reconciliation job (server/reconciliation.ts),
// which compares recent Stripe/Razorpay activity against these tables.
// Kept even after being resolved (not deleted) so there's a permanent
// record of what went wrong and when it was noticed/fixed.
export const reconciliationMismatches = pgTable("reconciliation_mismatches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: text("gateway").notNull(), // 'stripe' | 'razorpay'
  gatewayPaymentId: text("gateway_payment_id").notNull(),
  mismatchType: text("mismatch_type").notNull(), // 'missing_locally' | 'status_mismatch'
  gatewayStatus: text("gateway_status"),
  localStatus: text("local_status"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  details: jsonb("details"),
  status: text("status").notNull().default("open"), // 'open' | 'resolved'
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("UQ_reconciliation_mismatches_unique").on(table.gateway, table.gatewayPaymentId, table.mismatchType),
  index("IDX_reconciliation_mismatches_status").on(table.status),
  index("IDX_reconciliation_mismatches_created_at").on(table.createdAt),
]);

// Saved/tokenized payment instruments. PCI DSS: only gateway tokens, brand,
// and last4 are ever stored — never a PAN or CVV. Table exists for
// forward-compatibility (saved cards, Future-Ready Apple/Google Pay); not
// actively populated by the one-shot Razorpay Checkout flow in this phase.
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  gateway: text("gateway").notNull().default("razorpay"), // 'razorpay' | 'stripe'
  gatewayCustomerId: text("gateway_customer_id"),
  gatewayTokenId: text("gateway_token_id").notNull(), // opaque token — the only thing identifying the instrument

  type: text("type").notNull(), // 'card' | 'upi' | 'netbanking'
  displayBrand: text("display_brand"), // 'Visa' | 'Mastercard' | 'RuPay'
  last4: text("last4"),
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),

  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
}, (table) => [
  index("IDX_payment_methods_user_id").on(table.userId),
  uniqueIndex("UQ_payment_methods_gateway_token").on(table.gateway, table.gatewayTokenId),
]);

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull(), // e.g. INV-2026-000123, from a DB sequence
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  userId: varchar("user_id").notNull().references(() => users.id), // billed-to (the client)

  issuedAt: timestamp("issued_at").defaultNow().notNull(),

  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxBreakdown: jsonb("tax_breakdown"), // e.g. {"cgst":"9.00","sgst":"9.00"} — no new column per tax type
  platformCommissionAmount: decimal("platform_commission_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),

  status: text("status").notNull().default("issued"), // 'issued' | 'void'
  pdfStorageKey: text("pdf_storage_key"), // generated lazily on first download

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("UQ_invoices_invoice_number").on(table.invoiceNumber),
  index("IDX_invoices_session_id").on(table.sessionId),
  index("IDX_invoices_user_id").on(table.userId),
  index("IDX_invoices_issued_at").on(table.issuedAt),
]);

// Append-only, finance-specific audit log — kept separate from securityEvents
// because that table's sanitizeMetadata() strips 'amount'/'totalCost' keys,
// which is exactly what this table exists to record.
export const paymentAuditLogs = pgTable("payment_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id),
  userId: varchar("user_id").references(() => users.id), // null for system-initiated events (TTL sweep)

  actorType: text("actor_type").notNull(), // 'client' | 'professional' | 'admin' | 'system' | 'gateway_webhook'
  action: text("action").notNull(),
  // 'slot_reserved' | 'slot_released_ttl_expired' | 'payment_order_created' | 'payment_signature_verified' |
  // 'payment_verification_failed' | 'payment_captured' | 'wallet_debited' | 'booking_marked_paid' |
  // 'refund_initiated' | 'refund_completed' | 'refund_failed' | 'dispute_opened'

  paymentId: varchar("payment_id").references(() => payments.id),
  refundId: varchar("refund_id").references(() => refunds.id),
  bookingPaymentId: varchar("booking_payment_id").references(() => bookingPayments.id),

  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("INR"),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  metadata: jsonb("metadata"), // this table is finance/admin-only, so it may carry what securityEvents strips

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_payment_audit_logs_session_id").on(table.sessionId),
  index("IDX_payment_audit_logs_user_id").on(table.userId),
  index("IDX_payment_audit_logs_action").on(table.action),
  index("IDX_payment_audit_logs_created_at").on(table.createdAt),
]);

// Raw inbound webhook log, separate from paymentAuditLogs (which records
// business actions we took, not the wire event that triggered them). Two
// jobs: (1) the UQ constraint on (gateway, eventId) is the outermost,
// cheapest idempotency check — a redelivered event is skipped before it
// even reaches business logic, rather than relying solely on the
// payment-ID-level checks deeper in storage.creditWalletForGatewayPayment /
// recordCapture; (2) a durable record of every inbound event and whether it
// was actually processed, so a webhook that fails mid-processing (DB blip,
// unexpected exception) is a queryable row here instead of vanishing after
// a console.error with nothing to show for it.
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: text("gateway").notNull(), // 'stripe' | 'razorpay'
  eventId: text("event_id").notNull(), // gateway's own event id (Stripe evt_..., Razorpay's event payload has no top-level id, so a signature hash is used there — see webhookHandlers.ts)
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default("received"), // 'received' | 'processed' | 'failed' | 'ignored'
  payload: jsonb("payload").notNull(), // raw event body, for debugging/replay
  error: text("error"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (table) => [
  uniqueIndex("UQ_webhook_events_gateway_event_id").on(table.gateway, table.eventId),
  index("IDX_webhook_events_status").on(table.status),
  index("IDX_webhook_events_received_at").on(table.receivedAt),
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

// Crisis/safety signals detected in user-generated content (chat, journal, etc.)
// Server-side audit trail so a human can follow up - never rely on client-side detection alone.
export const crisisEvents = pgTable("crisis_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null for unauthenticated public chat
  source: text("source").notNull(), // 'chat', 'public_chat', 'journal'
  conversationId: varchar("conversation_id"), // present for chat sources
  severity: text("severity").notNull().default("high"), // room to add 'medium'/'low' tiers later
  matchedSignals: text("matched_signals").array().notNull().default(sql`ARRAY[]::text[]`),
  excerpt: text("excerpt").notNull(), // trimmed snippet of the flagged content, for reviewer context
  status: text("status").notNull().default("open"), // 'open', 'reviewed', 'resolved'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_crisis_events_user_id").on(table.userId),
  index("IDX_crisis_events_status").on(table.status),
  index("IDX_crisis_events_created_at").on(table.createdAt),
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

// Chat messages exchanged during a live session (distinct from
// chatMessages, which is the AI companion's own history). Previously this
// content only ever existed in-memory in server/realtime.ts's WS relay —
// never written to the database — so a refresh, a socket that wasn't open
// at send time, or either party reopening the session later lost the
// entire conversation with no transcript anywhere.
export const sessionMessages = pgTable("session_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  senderRole: text("sender_role").notNull(), // 'client' | 'professional'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_session_messages_session_id").on(table.sessionId),
  index("IDX_session_messages_created_at").on(table.createdAt),
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

// Hashes of a user's last several passwords, so password resets/changes can
// reject reuse. Never store plaintext or reversible passwords here.
export const passwordHistory = pgTable("password_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_password_history_user_id").on(table.userId),
]);

// Append-only audit trail for auth/authorization/abuse events. Metadata must
// never contain passwords, tokens, secrets, or message/session content —
// see server/security/events.ts, which enforces this at the call site.
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_security_events_user_id").on(table.userId),
  index("IDX_security_events_type").on(table.type),
  index("IDX_security_events_created_at").on(table.createdAt),
]);

// Coarse device/browser fingerprints seen per user, used only to flag a
// login from a fingerprint we haven't seen before (new-device email alert).
// Not used for tracking/ads — see privacy notes in server/security/devices.ts.
export const knownDevices = pgTable("known_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fingerprint: text("fingerprint").notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_known_devices_user_id").on(table.userId),
]);

// A client's application to become a listed professional. Approving one
// flips users.role to 'professional' and creates the professionalProfiles
// row — there is no other path to the 'professional' role.
export const professionalApplications = pgTable("professional_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  specialization: text("specialization").notNull(),
  qualification: text("qualification").notNull(),
  experience: integer("experience").notNull(),
  bio: text("bio"),
  languages: text("languages").array().notNull().default(sql`ARRAY['English']::text[]`),
  // Deprecated — professionals configure real pricing per consultation
  // type/duration in Session Settings after approval. Kept nullable for
  // backward compatibility with already-submitted applications.
  pricePerMinute: decimal("price_per_minute", { precision: 10, scale: 2 }),
  licenseNumber: text("license_number"),
  // [{ type: 'government_id' | 'professional_license' | 'degree' | 'certificate' | 'experience_proof',
  //    storageKey, originalName, mimeType, sizeBytes, uploadedAt }]
  documents: jsonb("documents").notNull().default(sql`'[]'::jsonb`),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_professional_applications_user_id").on(table.userId),
  index("IDX_professional_applications_status").on(table.status),
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  // Loose reference (like walletTransactions.sessionId) so notifications
  // about a booking can be clicked through to it — not a hard FK since not
  // every notification relates to a session and we don't want deletes to
  // ever be blocked by a notification row.
  relatedSessionId: varchar("related_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_notifications_user_id").on(table.userId),
  index("IDX_notifications_read").on(table.read),
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

export const crisisEventsRelations = relations(crisisEvents, ({ one }) => ({
  user: one(users, {
    fields: [crisisEvents.userId],
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

export const sessionTemplatesRelations = relations(sessionTemplates, ({ many }) => ({
  offerings: many(professionalSessionOfferings),
}));

export const professionalSessionOfferingsRelations = relations(professionalSessionOfferings, ({ one }) => ({
  professional: one(users, {
    fields: [professionalSessionOfferings.professionalId],
    references: [users.id],
  }),
  sessionTemplate: one(sessionTemplates, {
    fields: [professionalSessionOfferings.sessionTemplateId],
    references: [sessionTemplates.id],
  }),
}));

export const professionalAvailabilityRelations = relations(professionalAvailability, ({ one }) => ({
  professional: one(users, {
    fields: [professionalAvailability.professionalId],
    references: [users.id],
  }),
}));

export const professionalLeaveRelations = relations(professionalLeave, ({ one }) => ({
  professional: one(users, {
    fields: [professionalLeave.professionalId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  session: one(sessions, { fields: [payments.sessionId], references: [sessions.id] }),
}));

export const bookingPaymentsRelations = relations(bookingPayments, ({ one }) => ({
  session: one(sessions, { fields: [bookingPayments.sessionId], references: [sessions.id] }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  session: one(sessions, { fields: [refunds.sessionId], references: [sessions.id] }),
  bookingPayment: one(bookingPayments, { fields: [refunds.bookingPaymentId], references: [bookingPayments.id] }),
  walletTransaction: one(walletTransactions, { fields: [refunds.walletTransactionId], references: [walletTransactions.id] }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, { fields: [paymentMethods.userId], references: [users.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  session: one(sessions, { fields: [invoices.sessionId], references: [sessions.id] }),
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProfessionalProfileSchema = createInsertSchema(professionalProfiles).omit({
  id: true,
});

// Fields a professional may edit about themselves from Settings. pricePerMinute
// is deliberately excluded — pricing is now set per consultation type per
// session template via professionalSessionOfferings, not here.
export const updateProfessionalProfileSchema = insertProfessionalProfileSchema
  .pick({
    specialization: true,
    qualification: true,
    experience: true,
    bio: true,
    languages: true,
    instantSessionTimeoutSeconds: true,
  })
  .partial();

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

export const insertSessionTemplateSchema = createInsertSchema(sessionTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertProfessionalSessionOfferingSchema = createInsertSchema(professionalSessionOfferings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfessionalAvailabilitySchema = createInsertSchema(professionalAvailability).omit({
  id: true,
});

export const insertProfessionalLeaveSchema = createInsertSchema(professionalLeave).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingPaymentSchema = createInsertSchema(bookingPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
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

export const insertSessionMessageSchema = createInsertSchema(sessionMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCrisisEventSchema = createInsertSchema(crisisEvents).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export const insertProfessionalApplicationSchema = createInsertSchema(professionalApplications).omit({
  id: true,
  userId: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback)
  .omit({
    id: true,
    createdAt: true,
  })
  // The column itself has no length cap, so an arbitrarily large submission
  // was previously accepted and stored, then rendered in full on the admin
  // feedback list.
  .extend({
    feedbackText: z.string().trim().min(1, "Feedback cannot be empty").max(2000, "Feedback must be under 2000 characters"),
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

export type InsertSessionTemplate = z.infer<typeof insertSessionTemplateSchema>;
export type SessionTemplate = typeof sessionTemplates.$inferSelect;

export type InsertProfessionalSessionOffering = z.infer<typeof insertProfessionalSessionOfferingSchema>;
export type ProfessionalSessionOffering = typeof professionalSessionOfferings.$inferSelect;

export type InsertProfessionalAvailability = z.infer<typeof insertProfessionalAvailabilitySchema>;
export type ProfessionalAvailability = typeof professionalAvailability.$inferSelect;

export type InsertProfessionalLeave = z.infer<typeof insertProfessionalLeaveSchema>;
export type ProfessionalLeave = typeof professionalLeave.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertBookingPayment = z.infer<typeof insertBookingPaymentSchema>;
export type BookingPayment = typeof bookingPayments.$inferSelect;

export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

export const insertReconciliationMismatchSchema = createInsertSchema(reconciliationMismatches).omit({
  id: true,
  createdAt: true,
});
export type InsertReconciliationMismatch = z.infer<typeof insertReconciliationMismatchSchema>;
export type ReconciliationMismatch = typeof reconciliationMismatches.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type PaymentAuditLog = typeof paymentAuditLogs.$inferSelect;

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  receivedAt: true,
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertSessionMessage = z.infer<typeof insertSessionMessageSchema>;
export type SessionMessage = typeof sessionMessages.$inferSelect;

export type InsertCrisisEvent = z.infer<typeof insertCrisisEventSchema>;
export type CrisisEvent = typeof crisisEvents.$inferSelect;

export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;

export type InsertProfessionalApplication = z.infer<typeof insertProfessionalApplicationSchema>;
export type ProfessionalApplication = typeof professionalApplications.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type PasswordHistoryEntry = typeof passwordHistory.$inferSelect;
export type KnownDevice = typeof knownDevices.$inferSelect;

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
