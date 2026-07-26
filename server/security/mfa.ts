import { authenticator } from "otplib";
import crypto from "crypto";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { encryptField, decryptField } from "./encryption";

const ISSUER = "Focus";
const BACKUP_CODE_COUNT = 8;

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret);
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptField(encrypted);
}

export async function getEnrollmentQrCode(email: string, secret: string): Promise<string> {
  const uri = authenticator.keyuri(email, ISSUER, secret);
  return QRCode.toDataURL(uri);
}

export function verifyTotpToken(token: string, encryptedSecret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const secret = decryptTotpSecret(encryptedSecret);
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// Returns the absolute 30s time-step the token was valid for, or null if
// invalid — callers persist this as mfaLastUsedStep so verifyTotpTokenOnce
// can reject replaying the same (or an earlier) code next time.
function totpStepForToken(token: string, encryptedSecret: string): number | null {
  if (!/^\d{6}$/.test(token)) return null;
  try {
    const secret = decryptTotpSecret(encryptedSecret);
    const delta = authenticator.checkDelta(token, secret);
    if (delta === null || delta === undefined) return null;
    const stepSeconds = authenticator.allOptions().step;
    return Math.floor(Date.now() / (stepSeconds * 1000)) + delta;
  } catch {
    return null;
  }
}

// Single-use TOTP verification: valid AND not a replay of a code already
// accepted for this user. `lastUsedStep` is the caller's persisted
// mfaLastUsedStep (null if the user has never completed a TOTP check).
export function verifyTotpTokenOnce(
  token: string,
  encryptedSecret: string,
  lastUsedStep: number | null | undefined
): { valid: boolean; step: number | null } {
  const step = totpStepForToken(token, encryptedSecret);
  if (step === null) return { valid: false, step: null };
  if (lastUsedStep != null && step <= lastUsedStep) return { valid: false, step: null };
  return { valid: true, step };
}

// Backup codes are shown to the user once at enrollment, then only their
// bcrypt hashes are stored — same treatment as a password, since a leaked
// backup code is a full account-takeover credential.
export async function generateBackupCodes(): Promise<{ codes: string[]; hashes: string[] }> {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    codes.push(code);
    hashes.push(await bcrypt.hash(code, 10));
  }
  return { codes, hashes };
}

export async function verifyBackupCode(code: string, hashes: string[]): Promise<{ valid: boolean; remainingHashes: string[] }> {
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      const remainingHashes = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { valid: true, remainingHashes };
    }
  }
  return { valid: false, remainingHashes: hashes };
}
