// Explicit React import so this compiles under both the app's real Vite
// build (automatic JSX runtime, doesn't need it) and vitest's default esbuild
// transform (no @vitejs/plugin-react in vitest.config.ts, so it falls back to
// the classic React.createElement factory, which needs React in scope).
import React, { type ReactNode } from "react";

// The AI companion (and the crisis-response text in server/crisisDetection.ts)
// uses basic **bold** markdown for emphasis — rendering it as literal text
// (asterisks and all) reads as broken, especially in a crisis message where
// clarity matters most. This is a minimal, safe (no dangerouslySetInnerHTML)
// inline parser for exactly that one construct, not a general markdown
// engine, plus an opt-in phone-number linkifier for the crisis helplines.
export function renderFormattedText(text: string, linkifyPhoneNumbers = false): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  boldParts.forEach((part, i) => {
    if (part === "") return; // String.split's capturing group leaves empty strings at match boundaries.
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      const isPhoneNumber = linkifyPhoneNumbers && /^\d[\d-]{1,}\d$/.test(inner) && inner.replace(/-/g, "").length >= 3;
      nodes.push(
        <strong key={i}>
          {isPhoneNumber ? <a href={`tel:${inner.replace(/-/g, "")}`} className="underline">{inner}</a> : inner}
        </strong>
      );
      return;
    }
    if (!linkifyPhoneNumbers) {
      nodes.push(part);
      return;
    }
    // Matches number sequences like "112", "9152987821", "1860-2662-345" —
    // the helpline numbers in CRISIS_RESPONSE_TEXT — without catching
    // ordinary short numbers that might appear in prose.
    const phoneParts = part.split(/(\b\d[\d-]{1,}\d\b)/g);
    phoneParts.forEach((chunk, j) => {
      if (/^\d[\d-]{1,}\d$/.test(chunk) && chunk.replace(/-/g, "").length >= 3) {
        nodes.push(
          <a key={`${i}-${j}`} href={`tel:${chunk.replace(/-/g, "")}`} className="underline font-semibold">
            {chunk}
          </a>
        );
      } else if (chunk) {
        nodes.push(<span key={`${i}-${j}`}>{chunk}</span>);
      }
    });
  });

  return nodes;
}
