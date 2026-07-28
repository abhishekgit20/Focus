import { useQuery } from "@tanstack/react-query";

// Whether the AI companion (Gita Bot) is actually configured server-side.
// Lets Chatbot.tsx/ChatWidget.tsx show a real "coming soon" state instead of
// a chat UI that quietly replies with a canned "not configured" message
// while OPENAI_API_KEY is unset.
export function useAiCompanionStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json() as Promise<{ aiCompanionEnabled: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  return { enabled: data?.aiCompanionEnabled ?? false, isLoading };
}
