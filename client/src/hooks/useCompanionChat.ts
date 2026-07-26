import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

export interface CompanionMessage {
  role: "user" | "bot";
  text: string;
  source?: string;
  isCrisis?: boolean;
  // Not currently populated by the backend - kept optional so existing
  // render code in Chatbot.tsx/ChatWidget.tsx that checks for them still compiles.
  sanskrit?: string;
  purport?: string;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SOURCE = "Focus Wisdom Bot • Powered by ChatGPT";
const CRISIS_SOURCE = "Crisis Support • Please Reach Out";
const CONNECTION_ERROR_TEXT =
  "I apologize, but I'm having trouble connecting right now. Please try again in a moment. If you need immediate support, please reach out to a professional therapist.";

function formatBotSource(bhagavadGitaReference?: string, isCrisis?: boolean): string {
  if (isCrisis) return CRISIS_SOURCE;
  if (bhagavadGitaReference) return `Bhagavad Gita Reference: ${bhagavadGitaReference}`;
  return DEFAULT_SOURCE;
}

/**
 * Shared companion-chat logic for Chatbot.tsx (full page) and ChatWidget.tsx (floating widget).
 * Logged-in users get a real, persisted conversation via /api/chat (server holds history,
 * keyed by the user's own id as the conversationId - one ongoing companion thread per user).
 * Anonymous visitors keep the existing stateless /api/public-chat trial experience.
 * Crisis detection is server-side only (see server/crisisDetection.ts) - there is no
 * client-side keyword list here anymore, so there's nothing to drift between components.
 */
export function useCompanionChat(greeting: CompanionMessage) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<CompanionMessage[]>([greeting]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const conversationHistoryRef = useRef<ConversationTurn[]>([]);

  const conversationId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;
    let cancelled = false;

    setIsLoadingHistory(true);
    fetch(`/api/chat/${conversationId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        const history = (data.messages || []) as Array<{
          role: string;
          content: string;
          bhagavadGitaReference?: string;
        }>;
        if (history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role === "user" ? "user" : "bot",
              text: m.content,
              source: m.role === "assistant" ? formatBotSource(m.bhagavadGitaReference) : undefined,
            }))
          );
        }
      })
      .catch(() => {
        // Keep the default greeting if history can't be loaded.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, conversationId]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
      setIsTyping(true);

      try {
        if (isAuthenticated && conversationId) {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: userMessage, conversationId }),
          });
          if (!res.ok) throw new Error("Failed to get response");
          const data = await res.json();

          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: data.message.content,
              source: formatBotSource(data.message.bhagavadGitaReference, data.isCrisis),
              isCrisis: data.isCrisis,
            },
          ]);
        } else {
          const res = await fetch("/api/public-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMessage,
              conversationHistory: conversationHistoryRef.current,
            }),
          });
          if (!res.ok) throw new Error("Failed to get response");
          const data = await res.json();

          if (!data.isCrisis) {
            conversationHistoryRef.current = [
              ...conversationHistoryRef.current,
              { role: "user", content: userMessage },
              { role: "assistant", content: data.response },
            ];
          }

          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: data.response,
              source: formatBotSource(data.bhagavadGitaReference, data.isCrisis),
              isCrisis: data.isCrisis,
            },
          ]);
        }
      } catch (error) {
        console.error("Companion chat error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: CONNECTION_ERROR_TEXT, source: "System Message" },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isAuthenticated, conversationId]
  );

  return { messages, isTyping, isLoadingHistory, sendMessage, isAuthenticated };
}
