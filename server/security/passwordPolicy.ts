// A deliberately small, high-signal blocklist — not trying to be exhaustive
// (that's what the length/variety/email checks are for), just catching the
// passwords that show up at the top of every credential-stuffing wordlist.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty123", "qwertyuiop", "letmein123", "welcome123", "admin1234", "admin123",
  "iloveyou1", "abc123456", "111111111", "123123123", "sunshine1", "princess1",
  "football1", "monkey123", "dragon123", "master123", "trustno1", "superman1",
  "starwars1", "whatever1", "freedom123", "shadow123", "michael123", "jennifer1",
  "computer1", "internet1", "changeme1", "passw0rd1", "p@ssw0rd1", "letmein1",
]);

export interface PasswordCheckResult {
  valid: boolean;
  reason?: string;
}

export function checkPasswordStrength(password: string, email?: string): PasswordCheckResult {
  if (typeof password !== "string" || password.length < 10) {
    return { valid: false, reason: "Password must be at least 10 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, reason: "Password is too long" };
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { valid: false, reason: "This password is too common. Please choose a stronger one" };
  }

  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (varietyCount < 3) {
    return { valid: false, reason: "Password must include at least 3 of: lowercase letters, uppercase letters, numbers, symbols" };
  }

  if (email) {
    const localPart = email.split("@")[0]?.toLowerCase();
    if (localPart && localPart.length > 3 && lower.includes(localPart)) {
      return { valid: false, reason: "Password must not contain your email address" };
    }
  }

  return { valid: true };
}
