import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRawToken, hashToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/token";
import { sendVerificationEmail } from "@/lib/auth/email";
import { checkRateLimit, rateLimitHeaders, getClientIp } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const ResendSchema = z.object({
  // Same trim + lowercase normalisation as registration, otherwise a
  // mixed-case address never matches the stored row and the user silently
  // stops receiving verification links.
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

// Generic — anti-enumeration: always the same response regardless of outcome.
const OK: AuthResponse = {
  success: true,
  message:
    "If your email is registered and not yet verified, a new verification link has been sent.",
};

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json().catch(() => ({}));
    const result = ResendSchema.safeParse(body);
    if (!result.success) {
      // Return OK even on bad input — don't leak validation errors
      return NextResponse.json<AuthResponse>(OK, { status: 200 });
    }

    const { email } = result.data;

    // ── IP rate limit: 5 per hour ──────────────────────────────────────────
    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit({
      identifier:  ip,
      action:      "resend_verification",
      maxAttempts: 5,
      windowMs:    60 * 60 * 1000,
    });

    if (ipLimit.limited) {
      return NextResponse.json<AuthResponse>(OK, {
        status: 200,
        headers: rateLimitHeaders(ipLimit.retryAfter, 5),
      });
    }

    // ── Per-email rate limit: 1 per minute ─────────────────────────────────
    const emailLimit = await checkRateLimit({
      identifier:  email,
      action:      "resend_verification_email",
      maxAttempts: 1,
      windowMs:    60 * 1000, // 60 seconds
    });

    if (emailLimit.limited) {
      return NextResponse.json<AuthResponse>(OK, { status: 200 });
    }

    // ── Look up user ───────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where:  { email },
      select: { id: true, name: true, emailVerified: true, deletedAt: true },
    });

    // Already verified or no account → generic OK (anti-enumeration)
    if (!user || user.emailVerified || user.deletedAt !== null) {
      return NextResponse.json<AuthResponse>(OK, { status: 200 });
    }

    // ── Invalidate old tokens ──────────────────────────────────────────────
    await db.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    });

    // ── Issue fresh token ──────────────────────────────────────────────────
    const rawToken  = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await db.emailVerificationToken.create({
      data: { tokenHash, userId: user.id, expiresAt, used: false },
    });

    try {
      await sendVerificationEmail(email, user.name, rawToken);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send verification email";
      console.error("[auth/resend-verification] email failed:", errorMessage);
    }

    return NextResponse.json<AuthResponse>(OK, { status: 200 });
  } catch (error) {
    console.error("[auth/resend-verification]", error);
    return NextResponse.json<AuthResponse>(OK, { status: 200 }); // never leak errors
  }
}
