import argon2 from "argon2";
import bcrypt from "bcryptjs";

// Existing accounts were hashed with bcrypt (cost 10). Rather than force a
// mass password reset, new hashes use Argon2id and old bcrypt hashes keep
// verifying correctly until the user next logs in successfully, at which
// point routes.ts transparently re-hashes them to Argon2id (see
// needsRehash below). No user ever notices the migration.
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("$argon2")) {
    return argon2.verify(storedHash, password);
  }
  return bcrypt.compare(password, storedHash);
}

export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith("$argon2id$");
}
