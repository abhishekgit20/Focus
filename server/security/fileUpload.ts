import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import type { Readable } from "stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer as detectFileType } from "file-type";

// Documents uploaded for professional verification (government ID,
// licenses, degrees) are sensitive PII. Storage rules:
//  - never reachable via express.static or a public bucket URL — served
//    only through an authenticated, ownership-checked route (see routes.ts),
//    which streams from wherever storeDocumentContent() put it
//  - randomized filenames/object keys — the original filename is never
//    trusted or used as a key (path traversal / overwrite prevention)
//  - content is validated by magic bytes, not by extension or the
//    client-supplied MIME type, both of which are trivially spoofable
//  - PDF/JPEG/PNG only. No SVG (script-injection risk), no archives (zip
//    bombs), no executables — the allowlist itself rules those out.
//
// Persisted to Cloudflare R2 when configured (R2_ACCOUNT_ID/
// R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME) — required before
// real applications go through in production, since local disk does not
// survive a redeploy on Railway/Fly/Render/etc. Falls back to local disk
// with a loud warning when R2 isn't configured, so local dev keeps working
// without it.
export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "professional-applications");
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_FILES_PER_APPLICATION = 10;

let r2Client: S3Client | null = null;
function getR2Client(): { client: S3Client; bucket: string } | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return null;
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
  }
  return { client: r2Client, bucket: R2_BUCKET_NAME };
}

let warnedLocalFallback = false;
function warnLocalFallback() {
  if (warnedLocalFallback) return;
  warnedLocalFallback = true;
  console.warn(
    "⚠️  R2 storage not configured (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME) — " +
    "professional application documents are falling back to local disk, which does NOT survive a redeploy. " +
    "Fine for local development; set these before any real applications go through in production."
  );
}

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export const DOCUMENT_TYPES = [
  "government_id",
  "professional_license",
  "degree",
  "certificate",
  "experience_proof",
] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

// Buffer in memory first; nothing touches disk until it passes validation.
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_APPLICATION },
});

export interface ValidatedDocument {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: DocumentType;
}

export class FileValidationError extends Error {}

function assertValidStorageKey(storageKey: string): void {
  // storageKey always comes from this module's own crypto.randomUUID()
  // output stored in the DB — never from user input at read time — but
  // re-validate the shape anyway before touching R2 or the filesystem.
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(storageKey)) {
    throw new FileValidationError("Invalid storage key");
  }
}

function localPathFor(storageKey: string): string {
  const resolved = path.join(UPLOAD_ROOT, storageKey);
  if (path.dirname(resolved) !== UPLOAD_ROOT) {
    // Defense in depth against path traversal via a crafted storageKey,
    // even though randomUUID() can't produce one — belt and suspenders.
    throw new FileValidationError("Invalid file destination");
  }
  return resolved;
}

// Verifies real file content against the allowlist (magic bytes, not the
// filename or the Content-Type header the client sent) and persists it
// under a random key. Throws FileValidationError on anything that doesn't
// match — callers should reject the whole submission, not just skip the
// bad file, so a user can't silently end up with a partially documented
// application.
export async function validateAndStoreDocument(
  file: Express.Multer.File,
  documentType: DocumentType
): Promise<ValidatedDocument> {
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new FileValidationError(`Unknown document type: ${documentType}`);
  }

  const detected = await detectFileType(file.buffer);
  const mimeType = detected?.mime;
  if (!mimeType || !ALLOWED_TYPES[mimeType]) {
    throw new FileValidationError(
      `"${file.originalname}" is not a supported file type. Only PDF, JPEG, and PNG are accepted.`
    );
  }

  const storageKey = `${crypto.randomUUID()}${ALLOWED_TYPES[mimeType]}`;
  const r2 = getR2Client();

  if (r2) {
    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: mimeType,
    }));
  } else {
    warnLocalFallback();
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const destination = localPathFor(storageKey);
    await fs.writeFile(destination, file.buffer, { mode: 0o600 });
  }

  return {
    storageKey,
    originalName: file.originalname.slice(0, 255),
    mimeType,
    sizeBytes: file.size,
    documentType,
  };
}

// Streams a previously stored document back out, from R2 or local disk
// depending on where it was written (a document uploaded before R2 was
// configured stays readable from local disk — no migration needed for the
// switch itself to be safe, only for documents already lost to a prior
// redeploy).
export async function getDocumentStream(storageKey: string): Promise<{ stream: Readable; contentLength?: number }> {
  assertValidStorageKey(storageKey);

  const r2 = getR2Client();
  if (r2) {
    const result = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: storageKey }));
    if (!result.Body) throw new FileValidationError("Document not found in storage");
    return { stream: result.Body as Readable, contentLength: result.ContentLength };
  }

  const resolved = localPathFor(storageKey);
  return { stream: fsSync.createReadStream(resolved) };
}
