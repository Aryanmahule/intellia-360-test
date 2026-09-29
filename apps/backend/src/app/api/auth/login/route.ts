import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/auth/validation";
import { verifyPassword } from "@/lib/auth/hash";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import {
  peekRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  rateLimitHeaders,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { requireEmailVerification } from "@/lib/auth/verification-policy";
import { db } from "@/lib/db";
import type { AuthResponse, AuthUser } from "@intellia360/shared/types/auth";

// Pre-computed bcrypt hash of a fixed dummy string.
// Using a real bcrypt hash ensures the full Blowfish key-schedule runs even
// when the email is not found, making the response time indistinguishable
// from a real password comparison (timing-oracle prevention).
//
// Generated once with: bcrypt.hash("__dummy_intellia360_timing_guard__", 12)
const TIMING_GUARD_HASH =
  "$2b$12$.YdZj6pg0sawy3cr.nmHWuzXNK1JGdw7hXywGMt6Pu1A6q.X0yfLO";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_MAX_FAILURES = 10;
const EMAIL_MAX_FAILURES = 5;

export async function POST(request: NextRequest) {
  // ── 1. IP-based rate limit ─────────────────────────────────────────────────
  // 10 FAILED attempts per 15-minute window per IP address.
  // Peek only: the budget is spent in step 5 and solely on a failure, so a
  // school or office behind one NAT is not locked out by its own successful
  // sign-ins. This runs before any DB user lookup so it can't be bypassed.
  const ip = getClientIp(request);
  const ipLimitOpts = {
    identifier: ip,
    action: "login",
    maxAttempts: IP_MAX_FAILURES,
    windowMs: WINDOW_MS,
  };
  const ipLimit = await peekRateLimit(ipLimitOpts);

  if (ipLimit.limited) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: `Too many login attempts. Please try again in ${ipLimit.retryAfter} seconds.`,
      },
      { status: 429, headers: rateLimitHeaders(ipLimit.retryAfter, IP_MAX_FAILURES) }
    );
  }

  try {
    const body = await request.json();

    // ── 2. Schema validation ───────────────────────────────────────────────
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors as Record<string, string[]>,
        },
        { status: 422 }
      );
    }

    const { emailOrUsername, password, rememberMe } = result.data;

    // ── 3. Per-email rate limit (secondary, account-level) ─────────────────
    // 5 FAILED attempts per 15-minute window per email address. Peek only —
    // spending the budget here counted every correct sign-in against the
    // account and locked out users whose password was never wrong.
    const emailLimitOpts = {
      identifier: emailOrUsername,
      action: "login_email",
      maxAttempts: EMAIL_MAX_FAILURES,
      windowMs: WINDOW_MS,
    };
    const emailLimit = await peekRateLimit(emailLimitOpts);

    if (emailLimit.limited) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: `Too many attempts for this account. Try again in ${emailLimit.retryAfter} seconds.`,
        },
        { status: 429, headers: rateLimitHeaders(emailLimit.retryAfter, EMAIL_MAX_FAILURES) }
      );
    }

    // ── 4. User lookup ─────────────────────────────────────────────────────
    const dbUser = await db.user.findUnique({
      where: { email: emailOrUsername },
    });

    // ── 5. Timing-safe password comparison ────────────────────────────────
    // ALWAYS run bcrypt.compare, whether or not the user was found.
    // This makes both code-paths take the same ~100ms, preventing an attacker
    // from enumerating valid emails by observing response times.
    const passwordMatch = await verifyPassword(
      password,
      dbUser?.password ?? TIMING_GUARD_HASH
    );

    if (!dbUser || !passwordMatch) {
      // The only place the rate-limit budget is spent. Both counters move
      // together so a single wrong password costs one IP attempt and one
      // account attempt, and nothing else in this route costs anything.
      await Promise.all([
        recordFailedAttempt(ipLimitOpts),
        recordFailedAttempt(emailLimitOpts),
      ]);

      return NextResponse.json<AuthResponse>(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── 6. Deactivated-account gate ────────────────────────────────────────
    // Placed after the password comparison so a wrong password and a
    // deactivated account are indistinguishable to an unauthenticated caller.
    if (dbUser.deletedAt !== null) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "This account has been deactivated. Please contact an administrator.",
        },
        { status: 403 }
      );
    }

    // ── 7. Email verification gate ─────────────────────────────────────────
    let accountUser = dbUser;
    if (!dbUser.emailVerified && !requireEmailVerification()) {
      // Emailed links are not required (lib/auth/verification-policy.ts): the
      // correct password verifies the account right here, and any links still
      // outstanding are retired.
      accountUser = await db.user.update({
        where: { id: dbUser.id },
        data:  { emailVerified: true },
      });
      await db.emailVerificationToken.updateMany({
        where: { userId: dbUser.id, used: false },
        data:  { used: true },
      });
    }

    if (!accountUser.emailVerified) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message:
            "Your email address has not been verified. " +
            "Check your inbox for the verification link.",
          errors: { email: ["unverified"] },
        },
        { status: 403 }
      );
    }

    // ── 8. Issue session ───────────────────────────────────────────────────
    // The credential was correct, so clear this account's failure counter —
    // a run of typos must not keep counting against a user who then got it
    // right. The per-IP counter is deliberately left to decay on its own so a
    // valid login cannot be used to wipe an attacker's failure history.
    await resetRateLimit(emailOrUsername, "login_email");

    const user: AuthUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      emailVerified: accountUser.emailVerified,
      requestedRole: accountUser.requestedRole,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    await setSessionCookie(token, rememberMe);

    return NextResponse.json<AuthResponse<AuthUser>>(
      { success: true, message: "Logged in successfully", data: user },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
