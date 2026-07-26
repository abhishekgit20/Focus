// drizzle-orm >=0.44 wraps the underlying pg driver error in its own
// DrizzleQueryError, moving the original error (with .code) to .cause
// instead of copying it onto the wrapper. Every `err.code === "23505"`
// check in this codebase was written against the pre-upgrade shape (the
// raw pg error) and silently stopped matching after the drizzle-orm
// version bump (done for GHSA-gpj5-g38j-94v9, an unrelated SQL-injection
// fix) — confirmed by a real concurrency test hitting exactly this path.
// The DB constraint itself still enforces uniqueness either way (data
// integrity was never at risk), but the graceful "already exists, treat as
// a no-op" handling silently stopped working, meaning gateway webhook
// retries and slot-conflict checks got an uncaught error instead of the
// intended idempotent response.
export function getPgErrorCode(err: unknown): string | undefined {
  const code = (err as { code?: unknown })?.code ?? (err as { cause?: { code?: unknown } })?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export function isUniqueViolation(err: unknown): boolean {
  return getPgErrorCode(err) === "23505";
}
