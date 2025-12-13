// Centralized API service for Focus app
import type { User, ProfessionalProfile, Wallet, WalletTransaction, Session, JournalEntry, ChatMessage, Review } from "@shared/schema";

const API_BASE = "/api";

// Helper for API requests
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include", // Important for cookies/sessions
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "An error occurred" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== AUTH API ====================

export interface UserResponse {
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    profileImage?: string;
  };
}

export async function login(email: string, password: string): Promise<UserResponse> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  role: "client" | "professional";
  phone?: string;
  professionalProfile?: any;
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
  professionals: Array<ProfessionalProfile & { user: User }>;
}

export async function getAllProfessionals(): Promise<ProfessionalsResponse> {
  return apiRequest("/professionals");
}

export interface ProfessionalProfileResponse {
  profile: ProfessionalProfile;
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

export async function rechargeWallet(amount: number): Promise<WalletResponse> {
  return apiRequest("/wallet/recharge", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// ==================== SESSIONS API ====================

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionResponse {
  session: Session;
}

export interface UpcomingSessionsResponse {
  sessions: Array<Session & { client: User }>;
}

export async function createSession(data: {
  professionalId: string;
  scheduledAt: Date;
  type: "video" | "audio" | "chat";
}): Promise<SessionResponse> {
  return apiRequest("/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserSessions(): Promise<SessionsResponse> {
  return apiRequest("/sessions");
}

export async function getUpcomingSessions(): Promise<UpcomingSessionsResponse> {
  return apiRequest("/sessions/upcoming");
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
