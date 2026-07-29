// Centralized API service for Focus app
import type { User, ProfessionalProfile, Wallet, WalletTransaction, Session, JournalEntry, ChatMessage, Review, ProfessionalApplication, Notification } from "@shared/schema";

const API_BASE = "/api";

// Helper for API requests
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // FormData sets its own multipart boundary header — forcing JSON here
  // would break file uploads (e.g. professional application documents).
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
    credentials: "include", // Important for cookies/sessions
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "An error occurred", message: "An error occurred" }));
    // Prefer message field if available (more detailed), otherwise use error field
    const errorMessage = error.message || error.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

// ==================== AUTH API ====================

export interface UserResponse {
  success?: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    profileImage?: string;
    mfaEnabled?: boolean;
    emailVerified?: boolean;
    profileCompleted?: boolean;
  };
}

export type LoginResult = UserResponse | { mfaRequired: true };

// One login endpoint for every role — the server determines role from the
// DB after verifying the password. The frontend never declares (or trusts)
// an expected role.
export async function login(email: string, password: string, rememberMe = true): Promise<LoginResult> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, rememberMe }),
  });
}

export async function verifyMfaLogin(input: { token?: string; backupCode?: string }): Promise<UserResponse> {
  return apiRequest("/auth/mfa/verify-login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function verifyEmailToken(token: string): Promise<{ message: string }> {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationEmail(): Promise<{ message: string }> {
  return apiRequest("/auth/resend-verification", { method: "POST" });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function logoutAllDevices(): Promise<{ message: string }> {
  return apiRequest("/auth/logout-all-devices", { method: "POST" });
}

export interface MfaEnrollResponse {
  qrCode: string;
  secret: string;
}

export async function enrollMfa(): Promise<MfaEnrollResponse> {
  return apiRequest("/auth/mfa/enroll", { method: "POST" });
}

export async function confirmMfaEnrollment(token: string): Promise<{ message: string; backupCodes: string[] }> {
  return apiRequest("/auth/mfa/enroll/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function disableMfa(currentPassword: string): Promise<{ message: string }> {
  return apiRequest("/auth/mfa/disable", {
    method: "POST",
    body: JSON.stringify({ currentPassword }),
  });
}

export async function exportAccountData(): Promise<Record<string, unknown>> {
  return apiRequest("/account/export");
}

export async function deleteAccount(currentPassword?: string): Promise<{ message: string }> {
  return apiRequest("/account/delete", {
    method: "POST",
    body: JSON.stringify({ currentPassword }),
  });
}

// Every public signup creates a 'client' account — there is no self-service
// path to 'professional', 'admin', or 'super_admin'. See applyAsProfessional().
export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<UserResponse> {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  return apiRequest("/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<UserResponse> {
  return apiRequest("/auth/me");
}

// ==================== PROFESSIONALS API ====================

export interface ProfessionalsResponse {
  professionals: Array<ProfessionalProfile & { user: User; minPrice: string | null }>;
}

export async function getAllProfessionals(): Promise<ProfessionalsResponse> {
  return apiRequest("/professionals");
}

export interface ProfessionalProfileResponse {
  profile: ProfessionalProfile & { user: User };
}

export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfileResponse> {
  return apiRequest(`/professionals/${userId}`);
}

export async function updateProfessionalAvailability(isOnline: boolean): Promise<void> {
  return apiRequest("/professionals/availability", {
    method: "PATCH",
    body: JSON.stringify({ isOnline }),
  });
}

// ==================== SESSION TEMPLATES & OFFERINGS API ====================

export interface SessionTemplate {
  id: string;
  name: string;
  durationMinutes: number;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProfessionalOffering {
  id: string;
  professionalId: string;
  consultationType: "chat" | "audio" | "video";
  sessionTemplateId: string;
  price: string;
  enabled: boolean;
}

// The public, client-facing offerings response only (not the professional's
// own /api/professional/session-offerings, which edits the raw base `price`
// and never included this field). totalPrice is the actual GST-inclusive
// amount that will be locked as priceAtBooking -- the number a client should
// see and pay, everywhere, from the very first screen that shows a price.
export interface PublicProfessionalOffering extends ProfessionalOffering {
  totalPrice: string;
}

export async function getSessionTemplates(): Promise<{ templates: SessionTemplate[] }> {
  return apiRequest("/session-templates");
}

export async function getMyOfferings(): Promise<{ offerings: ProfessionalOffering[] }> {
  return apiRequest("/professional/session-offerings");
}

export async function upsertOffering(input: {
  consultationType: "chat" | "audio" | "video";
  sessionTemplateId: string;
  price: string;
  enabled: boolean;
}): Promise<{ offering: ProfessionalOffering }> {
  return apiRequest("/professional/session-offerings", { method: "PUT", body: JSON.stringify(input) });
}

export async function getProfessionalOfferings(professionalId: string): Promise<{ offerings: PublicProfessionalOffering[] }> {
  return apiRequest(`/professionals/${professionalId}/offerings`);
}

export async function getAvailabilitySlots(professionalId: string, date: string, sessionTemplateId: string): Promise<{ slots: string[] }> {
  return apiRequest(`/professionals/${professionalId}/availability-slots?date=${encodeURIComponent(date)}&sessionTemplateId=${sessionTemplateId}`);
}

export interface WorkingHours {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export async function getMyWorkingHours(): Promise<{ hours: WorkingHours[] }> {
  return apiRequest("/professional/working-hours");
}

export async function setWorkingHours(input: { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }): Promise<{ hours: WorkingHours }> {
  return apiRequest("/professional/working-hours", { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteWorkingHours(dayOfWeek: number): Promise<void> {
  return apiRequest(`/professional/working-hours/${dayOfWeek}`, { method: "DELETE" });
}

export interface LeaveEntry {
  id: string;
  professionalId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export async function getMyLeave(): Promise<{ leave: LeaveEntry[] }> {
  return apiRequest("/professional/leave");
}

export async function createLeave(input: { startDate: string; endDate: string; reason?: string }): Promise<{ leave: LeaveEntry }> {
  return apiRequest("/professional/leave", { method: "POST", body: JSON.stringify(input) });
}

export async function deleteLeave(id: string): Promise<void> {
  return apiRequest(`/professional/leave/${id}`, { method: "DELETE" });
}

// ==================== BOOKING & PAYMENT API ====================
// Replaces the old direct session-creation flow: every booking now reserves
// a priced slot, then pays (wallet / gateway / split) before it's confirmed.

export interface SessionResponse {
  session: Session;
}

export interface PriceBreakdown {
  base: string;
  discount: string;
  tax: string;
  commission: string;
  total: string;
}

export async function reserveBookingSlot(input: {
  professionalId: string;
  consultationType: "chat" | "audio" | "video";
  sessionTemplateId: string;
  mode: "instant" | "scheduled";
  scheduledAt?: string;
}): Promise<{ session: Session; pricing: PriceBreakdown }> {
  return apiRequest("/bookings/reserve", { method: "POST", body: JSON.stringify(input) });
}

export interface PayForBookingResult {
  paid: boolean;
  bookingPayments?: unknown[];
  razorpayOrderId?: string;
  gatewayAmount?: string;
  walletAmount?: string;
  keyId?: string;
  currency?: string;
}

export async function payForBooking(
  sessionId: string,
  method: "wallet" | "gateway" | "split",
  idempotencyKey?: string
): Promise<PayForBookingResult> {
  return apiRequest(`/bookings/${sessionId}/pay`, {
    method: "POST",
    body: JSON.stringify({ method, idempotencyKey }),
  });
}

export async function verifyBookingPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ paid: boolean }> {
  return apiRequest("/payments/verify", { method: "POST", body: JSON.stringify(input) });
}

export async function cancelBooking(sessionId: string): Promise<{ message: string; refundStatus?: "initiated" | "failed" }> {
  return apiRequest(`/bookings/${sessionId}/cancel`, { method: "POST" });
}

export async function respondToSessionRequest(sessionId: string, accept: boolean): Promise<SessionResponse> {
  return apiRequest(`/sessions/${sessionId}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ accept }),
  });
}

// ==================== INVOICES API ====================

export interface Invoice {
  id: string;
  invoiceNumber: string;
  sessionId: string;
  totalAmount: string;
  baseAmount: string;
  taxAmount: string;
  discountAmount: string;
  issuedAt: string;
}

export async function getInvoice(sessionId: string): Promise<{ invoice: Invoice }> {
  return apiRequest(`/bookings/${sessionId}/invoice`);
}

export function getInvoicePdfUrl(sessionId: string): string {
  return `${API_BASE}/bookings/${sessionId}/invoice/pdf`;
}

export async function emailInvoice(sessionId: string): Promise<{ message: string }> {
  return apiRequest(`/bookings/${sessionId}/invoice/email`, { method: "POST" });
}

// ==================== WALLET API ====================

export interface WalletResponse {
  wallet: Wallet;
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
}

export async function getWallet(): Promise<WalletResponse> {
  return apiRequest("/wallet");
}

export async function getWalletTransactions(): Promise<TransactionsResponse> {
  return apiRequest("/wallet/transactions");
}

export interface CheckoutSessionStatus {
  status: "not_paid" | "paid_pending_credit" | "credited";
  wallet?: Wallet;
}

// Confirms what actually happened to a Stripe Checkout session, rather than
// trusting the success_url redirect alone — Stripe sends the browser back
// as soon as Checkout completes, which can race ahead of the webhook that
// actually credits the wallet.
export async function getWalletCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus> {
  return apiRequest(`/wallet/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`);
}

export async function rechargeWallet(amount: number): Promise<WalletResponse> {
  return apiRequest("/wallet/recharge", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// ==================== SESSIONS API ====================
// Scheduled/instant booking creation now happens via reserveBookingSlot +
// payForBooking above — there is no direct "create a session" call anymore.

export interface SessionsResponse {
  sessions: Session[];
}

export interface UpcomingSessionsResponse {
  sessions: Array<Session & { client: User }>;
}

export async function getUserSessions(): Promise<SessionsResponse> {
  return apiRequest("/sessions");
}

export async function getUpcomingSessions(): Promise<UpcomingSessionsResponse> {
  return apiRequest("/sessions/upcoming");
}

export async function getSessionById(id: string): Promise<SessionResponse> {
  return apiRequest(`/sessions/${id}`);
}

export interface SessionCounterpart {
  id: string;
  fullName: string | null;
  profileImage: string | null;
  specialization: string | null;
}

export async function getSessionCounterpart(sessionId: string): Promise<{ counterpart: SessionCounterpart }> {
  return apiRequest(`/sessions/${sessionId}/counterpart`);
}

export interface SessionMessageDto {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: "client" | "professional";
  content: string;
  createdAt: string;
}

export async function getSessionMessages(sessionId: string): Promise<{ messages: SessionMessageDto[] }> {
  return apiRequest(`/sessions/${sessionId}/messages`);
}

// Fallback for when the session's WebSocket isn't open — see the matching
// route comment in server/routes.ts. The WS send path stays the primary one.
export async function sendSessionMessageViaRest(sessionId: string, content: string): Promise<{ message: SessionMessageDto }> {
  return apiRequest(`/sessions/${sessionId}/messages`, { method: "POST", body: JSON.stringify({ content }) });
}

// ==================== WEBRTC API ====================

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export async function getIceServers(): Promise<{ iceServers: IceServer[] }> {
  return apiRequest("/webrtc/ice-servers");
}

export async function updateSessionStatus(
  sessionId: string,
  status: string,
  data?: {
    startTime?: Date;
    endTime?: Date;
    durationMinutes?: number;
    totalCost?: string;
  }
): Promise<void> {
  return apiRequest(`/sessions/${sessionId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...data }),
  });
}

// ==================== EARNINGS API ====================

export interface EarningsResponse {
  earnings: any[];
}

export interface TodayEarningsResponse {
  todayEarnings: string;
}

export async function getEarnings(): Promise<EarningsResponse> {
  return apiRequest("/earnings");
}

export async function getTodayEarnings(): Promise<TodayEarningsResponse> {
  return apiRequest("/earnings/today");
}

// ==================== JOURNAL API ====================

export interface JournalEntriesResponse {
  entries: JournalEntry[];
}

export interface JournalEntryResponse {
  entry: JournalEntry;
}

export async function createJournalEntry(data: {
  title?: string;
  content: string;
  mood?: string;
  tags?: string[];
}): Promise<JournalEntryResponse> {
  return apiRequest("/journal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getJournalEntries(): Promise<JournalEntriesResponse> {
  return apiRequest("/journal");
}

// ==================== CHAT API ====================

export interface ChatMessagesResponse {
  messages: ChatMessage[];
}

export interface ChatMessageResponse {
  message: ChatMessage;
}

export async function sendChatMessage(
  conversationId: string,
  message: string
): Promise<ChatMessageResponse> {
  return apiRequest("/chat", {
    method: "POST",
    body: JSON.stringify({ conversationId, message }),
  });
}

export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessagesResponse> {
  return apiRequest(`/chat/${conversationId}`);
}

// ==================== REVIEWS API ====================

export interface ReviewsResponse {
  reviews: Review[];
}

export interface ReviewResponse {
  review: Review;
}

export async function createReview(data: {
  sessionId: string;
  clientId: string;
  professionalId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewResponse> {
  return apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProfessionalReviews(professionalId: string): Promise<ReviewsResponse> {
  return apiRequest(`/reviews/${professionalId}`);
}

// ==================== APPLY AS PROFESSIONAL ====================
// The only path from 'client' to 'professional' — submit an application with
// supporting documents, then wait for an admin to approve or reject it.

export const DOCUMENT_TYPES = [
  "government_id",
  "professional_license",
  "degree",
  "certificate",
  "experience_proof",
] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export interface ProfessionalApplicationResponse {
  application: ProfessionalApplication | null;
}

export async function applyAsProfessional(data: {
  specialization: string;
  qualification: string;
  experience: number;
  bio?: string;
  languages: string[];
  licenseNumber?: string;
  documents: Partial<Record<DocumentType, File>>;
}): Promise<{ application: ProfessionalApplication }> {
  const formData = new FormData();
  formData.append("specialization", data.specialization);
  formData.append("qualification", data.qualification);
  formData.append("experience", String(data.experience));
  if (data.bio) formData.append("bio", data.bio);
  formData.append("languages", JSON.stringify(data.languages));
  if (data.licenseNumber) formData.append("licenseNumber", data.licenseNumber);
  for (const [documentType, file] of Object.entries(data.documents)) {
    if (file) formData.append(documentType, file);
  }

  return apiRequest("/professional-applications", { method: "POST", body: formData });
}

export async function getMyProfessionalApplication(): Promise<ProfessionalApplicationResponse> {
  return apiRequest("/professional-applications/mine");
}

export function getApplicationDocumentUrl(applicationId: string, storageKey: string): string {
  return `${API_BASE}/professional-applications/${applicationId}/documents/${storageKey}`;
}

// ==================== ADMIN: PROFESSIONAL APPLICATIONS ====================

export interface AdminApplicationsResponse {
  applications: Array<ProfessionalApplication & { applicant: User; suspended?: boolean }>;
}

export async function getApplicationsByStatus(
  status: "pending" | "approved" | "rejected" = "pending"
): Promise<AdminApplicationsResponse> {
  return apiRequest(`/admin/professional-applications?status=${status}`);
}

export async function approveApplication(id: string): Promise<{ application: ProfessionalApplication }> {
  return apiRequest(`/admin/professional-applications/${id}/approve`, { method: "POST" });
}

export async function rejectApplication(id: string, reason: string): Promise<{ application: ProfessionalApplication }> {
  return apiRequest(`/admin/professional-applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendProfessional(userId: string, reason: string): Promise<{ message: string }> {
  return apiRequest(`/admin/professionals/${userId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function reactivateProfessional(userId: string): Promise<{ message: string }> {
  return apiRequest(`/admin/professionals/${userId}/reactivate`, { method: "POST" });
}

// ==================== ADMIN: PAYMENTS & REFUNDS ====================

export interface AdminPayment {
  id: string;
  userId: string;
  sessionId: string;
  gateway: string;
  amount: string;
  status: string;
  method: string | null;
  createdAt: string;
}

export interface AdminRefund {
  id: string;
  sessionId: string;
  amount: string;
  reason: string;
  status: string;
  destination: string;
  createdAt: string;
}

export async function getAdminPayments(offset = 0): Promise<{ payments: AdminPayment[]; hasMore: boolean }> {
  return apiRequest(`/admin/payments?offset=${offset}`);
}

export async function getAdminRefunds(offset = 0): Promise<{ refunds: AdminRefund[]; hasMore: boolean }> {
  return apiRequest(`/admin/refunds?offset=${offset}`);
}

export async function issueManualRefund(sessionId: string, reason: string): Promise<{ refunds: AdminRefund[] }> {
  return apiRequest(`/admin/refunds/${sessionId}/issue`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function issuePartialRefund(
  sessionId: string,
  amount: string,
  reason: string,
  idempotencyKey: string
): Promise<{ refunds: AdminRefund[] }> {
  return apiRequest(`/admin/refunds/${sessionId}/partial`, {
    method: "POST",
    body: JSON.stringify({ amount, reason, idempotencyKey }),
  });
}

// ==================== NOTIFICATIONS API ====================

export interface NotificationsResponse {
  notifications: Notification[];
}

export async function getNotifications(): Promise<NotificationsResponse> {
  return apiRequest("/notifications");
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  return apiRequest("/notifications/unread-count");
}

export async function markNotificationRead(id: string): Promise<{ message: string }> {
  return apiRequest(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiRequest("/notifications/read-all", { method: "POST" });
}
