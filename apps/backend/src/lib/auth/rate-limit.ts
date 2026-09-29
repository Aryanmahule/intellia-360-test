/**
 * DB-backed rate limiter — works in serverless / multi-instance deployments.
 *
 * Uses MongoDB via Prisma rather than in-memory Maps, so limits are shared
 * across every function instance (Vercel, AWS Lambda, etc.).
 *
 * The `key` stored in the DB is always SHA-256(raw_identifier) — never raw
 * IP addresses or emails (reduces PII stored in the rate-limit table).
 *
 * Two modes, and picking the wrong one is a bug:
 *
 *   • Throttling work a request triggers (sending a reset email, a verification
 *     resend, a registration) — every request should count. Use `checkRateLimit`,
 *     which checks and increments in one step.
 *
 *   • Guarding a credential check (login) — only a *failure* should count, or a
 *     user who signs in correctly still spends the budget and eventually locks
 *     themselves out. Use `peekRateLimit` to gate, `recordFailedAttempt` when
 *     the credential is wrong, and `resetRateLimit` once it is right.
 *
 * Usage:
 *   const { limited, remaining, retryAfter } = await checkRateLimit({
 *     identifier: ip,
 *     action:     "forgot_password",
 *     maxAttempts: 3,
 *     windowMs:    60 * 60 * 1000,   // 1 hour
 *   });
 *   if (limited) return NextResponse.json({ ... }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
 */

import crypto from "crypto";
import { db } from "@/lib/db";

export interface RateLimitOptions {
  /** Raw identifier — IP address, email address, userId, etc. */
  identifier: string;
  /** Logical action name — "login", "forgot_password", "resend_verification" */
  action: string;
  /** Maximum allowed attempts within the window. */
  maxAttempts: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** True when the caller has exceeded the limit and should be blocked. */
  limited: boolean;
  /** How many attempts remain in the current window (0 when limited). */
  remaining: number;
  /** Seconds until the window resets (only meaningful when limited). */
  retryAfter: number;
}

/** One-way hash of a raw identifier so we never store PII in the rate-limit table. */
function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw.toLowerCase().trim()).digest("hex");
}

/**
 * Read-only check — reports whether the caller is over the limit WITHOUT
 * spending an attempt.
 *
 * Pair this with `recordFailedAttempt` / `resetRateLimit` for credential checks,
 * where only a *failure* should count against the budget. `checkRateLimit`
 * increments on every call, which is right for throttling request-triggered
 * work (password-reset emails, verification resends) but wrong for a login:
 * there it burns the budget on the successful logins too and eventually locks
 * an account whose password was correct every single time.
 */
export async function peekRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { identifier, action, maxAttempts, windowMs } = opts;
  const key = hashKey(identifier);
  const now = Date.now();

  try {
    const record = await db.rateLimitRecord.findUnique({
      where: { key_action: { key, action } },
    });

    // No record, or the previous window has lapsed — nothing counted yet.
    if (!record || record.windowStart.getTime() + windowMs < now) {
      return { limited: false, remaining: maxAttempts, retryAfter: 0 };
    }

    const limited = record.count >= maxAttempts;
    const resetAt = record.windowStart.getTime() + windowMs;

    return {
      limited,
      remaining: Math.max(0, maxAttempts - record.count),
      retryAfter: limited ? Math.max(1, Math.ceil((resetAt - now) / 1000)) : 0,
    };
  } catch (err) {
    console.error("[rate-limit] DB error on peek, failing open:", err);
    return { limited: false, remaining: maxAttempts, retryAfter: 0 };
  }
}

/**
 * Spend one attempt against the budget. Call this only when an attempt has
 * actually failed, so a correct credential never counts toward a lockout.
 */
export async function recordFailedAttempt(opts: RateLimitOptions): Promise<void> {
  const { identifier, action, windowMs } = opts;
  const key = hashKey(identifier);
  const now = Date.now();

  try {
    const record = await db.rateLimitRecord.upsert({
      where: { key_action: { key, action } },
      create: { key, action, count: 1, windowStart: new Date(now) },
      update: { count: { increment: 1 } },
    });

    // The increment above landed on a stale window — restart the window at 1.
    if (record.windowStart.getTime() + windowMs < now) {
      await db.rateLimitRecord.update({
        where: { key_action: { key, action } },
        data: { count: 1, windowStart: new Date(now) },
      });
    }
  } catch (err) {
    // Never let a rate-limit bookkeeping failure break the auth response.
    console.error("[rate-limit] DB error on record, ignoring:", err);
  }
}

/**
 * Clear the counter for an identifier — used after a successful credential
 * check so a run of typos does not keep counting against a user who then
 * signed in correctly.
 */
export async function resetRateLimit(identifier: string, action: string): Promise<void> {
  const key = hashKey(identifier);
  try {
    await db.rateLimitRecord.deleteMany({ where: { key, action } });
  } catch (err) {
    console.error("[rate-limit] DB error on reset, ignoring:", err);
  }
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { identifier, action, maxAttempts, windowMs } = opts;
  const key       = hashKey(identifier);
  const now       = Date.now();

  try {
    // Upsert: atomically increment count, reset window if expired.
    const record = await db.rateLimitRecord.upsert({
      where:  { key_action: { key, action } },
      create: {
        key,
        action,
        count:       1,
        windowStart: new Date(now),
      },
      update: {
        // If the current window has expired, reset it.
        count: {
          increment: 1,
        },
        // windowStart is only updated when we reset — handled below via a
        // two-step operation because Prisma doesn't support conditional updates.
      },
    });

    const windowExpired =
      record.windowStart.getTime() + windowMs < now;

    if (windowExpired) {
      // Reset the window
      await db.rateLimitRecord.update({
        where:  { key_action: { key, action } },
        data:   { count: 1, windowStart: new Date(now) },
      });
      return { limited: false, remaining: maxAttempts - 1, retryAfter: 0 };
    }

    const count     = record.count;
    const limited   = count > maxAttempts;
    const remaining = Math.max(0, maxAttempts - count);
    const resetAt   = record.windowStart.getTime() + windowMs;
    const retryAfter = limited ? Math.ceil((resetAt - now) / 1000) : 0;

    return { limited, remaining, retryAfter };
  } catch (err) {
    // If the rate-limit DB call fails (e.g. transient network error),
    // fail OPEN — don't block legitimate users for an infrastructure blip.
    console.error("[rate-limit] DB error, failing open:", err);
    return { limited: false, remaining: maxAttempts, retryAfter: 0 };
  }
}

/** Helper: build the standard 429 headers for rate-limited responses. */
export function rateLimitHeaders(
  retryAfter: number,
  maxAttempts?: number
): Record<string, string> {
  return {
    "Retry-After":        String(retryAfter),
    "X-RateLimit-Limit":  maxAttempts != null ? String(maxAttempts) : "0",
    "X-RateLimit-Reset":  String(Math.floor(Date.now() / 1000) + retryAfter),
  };
}

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(request: { headers: { get(k: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
