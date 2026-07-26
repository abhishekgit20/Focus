import type { User } from "@shared/schema";

// SECURITY: any query that joins the users table and hands the row back for
// an API response (professional listings, session participant info, etc.)
// must strip these before it leaves the server. Sending them client-side
// previously leaked every professional's password hash to the public,
// unauthenticated /api/professionals endpoint, plus everyone's encrypted
// MFA secret, backup-code hashes, and password-reset/email-verification
// token hashes on authenticated endpoints. Kept dependency-free (no db.ts
// import) so it stays trivially unit-testable.
export type SafeUser = Omit<
  User,
  "password" | "mfaSecretEncrypted" | "mfaBackupCodeHashes" | "emailVerificationTokenHash" | "passwordResetTokenHash"
>;

export function sanitizeUser(user: User): SafeUser {
  const { password, mfaSecretEncrypted, mfaBackupCodeHashes, emailVerificationTokenHash, passwordResetTokenHash, ...safe } = user;
  return safe;
}
