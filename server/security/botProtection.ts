// A field named plausibly (e.g. "website") that's hidden from real users via
// CSS but present in the DOM — bots that auto-fill every field trip it.
export function isHoneypotTriggered(body: Record<string, unknown> | undefined): boolean {
  const value = body?.website;
  return typeof value === "string" && value.trim().length > 0;
}

// The client sends the timestamp the form was rendered; submitting well
// under human reaction time is a strong bot signal. Missing timestamp never
// blocks the request — only tightens confidence when present.
export function isSubmittedSuspiciouslyFast(formRenderedAt: unknown, minMs = 1200): boolean {
  const ts = Number(formRenderedAt);
  if (!ts || Number.isNaN(ts)) return false;
  return Date.now() - ts < minMs;
}

// Inert unless CAPTCHA_SECRET_KEY / CAPTCHA_VERIFY_URL are configured, so
// self-hosted deployments without a CAPTCHA vendor aren't blocked from
// signing up. Recommended: Cloudflare Turnstile (free, privacy-respecting) —
// CAPTCHA_VERIFY_URL=https://challenges.cloudflare.com/turnstile/v0/siteverify
export async function verifyCaptcha(token: unknown): Promise<boolean> {
  const secret = process.env.CAPTCHA_SECRET_KEY;
  const verifyUrl = process.env.CAPTCHA_VERIFY_URL;
  if (!secret || !verifyUrl) return true;
  if (typeof token !== "string" || !token) return false;

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false; // verifier unreachable — fail closed
  }
}
