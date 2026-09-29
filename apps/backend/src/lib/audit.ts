/**
 * Append-only audit trail for privileged and destructive actions.
 *
 * Every admin/editor mutation routes through here so the platform can answer
 * "who changed this, when, and what did it look like before?" — previously the
 * only trace an admin left when deleting a user, course or school was the
 * absence of the row itself.
 *
 * Design notes
 * ────────────
 * • Writes are best-effort: an audit failure must never turn a successful
 *   mutation into a 500 for the caller. Failures are logged loudly instead.
 * • `before`/`after` carry only the fields that changed, and are scrubbed of
 *   secrets before they are stored (see REDACTED_KEYS).
 * • The actor's email and role are denormalised onto the row so the entry stays
 *   readable after the actor's own account is removed.
 * • IP addresses are stored as a SHA-256 hash, matching the rate limiter's
 *   policy of never persisting raw network PII.
 */
import crypto from "crypto";
import { db } from "@/lib/db";

/** Never persist these, at any nesting depth, even if a caller passes them. */
const REDACTED_KEYS = new Set([
  "password",
  "hashedpassword",
  "passwordhash",
  "token",
  "tokenhash",
  "rawtoken",
  "secret",
  "apikey",
  "authorization",
]);

const MAX_DEPTH = 4;
const MAX_STRING = 512;

/** Recursively strip secrets and clamp size so one entry can't bloat the collection. */
function scrub(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (depth >= MAX_DEPTH) return "[truncated]";

  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? "[redacted]" : scrub(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

/** One-way hash — the audit trail records "same client" without storing the address. */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export interface AuditActor {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AuditEntry {
  actor: AuditActor | null;
  /** Dotted verb: "user.delete", "course.update", "curriculum.save". */
  action: string;
  entityType: string;
  entityId?: string | null;
  /** One-line human summary rendered directly in the admin UI. */
  summary: string;
  before?: unknown;
  after?: unknown;
  request?: { headers: { get(k: string): string | null } } | null;
}

/**
 * Record one audited action. Never throws — callers can await it without
 * wrapping, and a broken audit write degrades to a console error.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const ipRaw =
      entry.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      entry.request?.headers.get("x-real-ip") ??
      null;

    await db.auditLog.create({
      data: {
        actorId: entry.actor?.userId ?? null,
        actorEmail: entry.actor?.email ?? null,
        actorRole: entry.actor?.role ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        before: entry.before === undefined ? undefined : (scrub(entry.before) as never),
        after: entry.after === undefined ? undefined : (scrub(entry.after) as never),
        ip: hashIp(ipRaw),
        userAgent: entry.request?.headers.get("user-agent")?.slice(0, 256) ?? null,
      },
    });
  } catch (err) {
    // Deliberately swallowed — see the header note on best-effort writes.
    console.error("[audit] failed to record", entry.action, err);
  }
}

/**
 * Diff two records down to just the keys that actually changed, so an audit row
 * stores the delta rather than two full copies of the document.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  if (!before || !after) return { before: before ?? {}, after: after ?? {} };

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const bv = before[key];
    const av = after[key];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      b[key] = bv;
      a[key] = av;
    }
  }
  return { before: b, after: a };
}
