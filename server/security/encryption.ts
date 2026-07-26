import crypto from "crypto";

// Field-level encryption for at-rest secrets that must be recoverable
// (unlike passwords, which are only ever hashed) — currently just MFA TOTP
// secrets. AES-256-GCM: authenticated encryption, random IV per value.
let keyMaterial = process.env.FIELD_ENCRYPTION_KEY;

if (!keyMaterial) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FIELD_ENCRYPTION_KEY environment variable is required in production");
  }
  keyMaterial = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️  WARNING: FIELD_ENCRYPTION_KEY not set. Using a random per-process key — encrypted fields (e.g. MFA secrets) become unreadable on restart. Set FIELD_ENCRYPTION_KEY for a stable value (openssl rand -hex 32).");
}

// Accept a 64-char hex string (32 bytes) directly; otherwise derive a
// 32-byte key from whatever was provided so misconfiguration doesn't crash.
const KEY = /^[0-9a-f]{64}$/i.test(keyMaterial)
  ? Buffer.from(keyMaterial, "hex")
  : crypto.createHash("sha256").update(keyMaterial).digest();

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptField(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed encrypted field payload");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
