// Centralized, server-side crisis/self-harm signal detection.
// This is the authoritative check - client-side keyword matching (in Chatbot.tsx /
// ChatWidget.tsx) is only a fast-feedback layer and must never be relied on alone,
// since it can be bypassed by any client that isn't running that JS.

const CRISIS_KEYWORDS = [
  "suicide", "suicidal", "kill myself", "end my life", "want to die",
  "self harm", "self-harm", "hurt myself", "cutting myself",
  "no reason to live", "better off dead", "death wish", "ending it all",
  "आत्महत्या", "मरना चाहता", "मरना चाहती", "जीना नहीं चाहता", "खुद को मारना",
];

export const CRISIS_RESPONSE_TEXT = `🚨 I'm very concerned about what you've shared. Your life matters, and help is available right now.

**Emergency Helplines (India):**
📞 iCall: 9152987821 (Mon-Sat, 8am-10pm)
📞 Vandrevala Foundation: 1860-2662-345 (24/7)
📞 NIMHANS: 080-46110007 (24/7)
📞 Snehi: 044-24640050 (24/7)

Please reach out to one of these numbers immediately. They have trained counselors who understand what you're going through.

If you're in immediate danger, please call **112** (Emergency) or go to your nearest hospital.

You are not alone. There are people who care about you and want to help. 💙`;

export interface CrisisDetectionResult {
  isCrisis: boolean;
  matchedSignals: string[];
}

export function detectCrisisSignal(text: string): CrisisDetectionResult {
  const lowerText = text.toLowerCase();
  const matchedSignals = CRISIS_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
  return { isCrisis: matchedSignals.length > 0, matchedSignals };
}

// Keep excerpts short - this is sensitive content stored for human review, not a full transcript.
const EXCERPT_MAX_LENGTH = 500;

export function buildCrisisExcerpt(text: string): string {
  return text.length > EXCERPT_MAX_LENGTH
    ? text.slice(0, EXCERPT_MAX_LENGTH) + "..."
    : text;
}
