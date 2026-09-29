import { NextRequest, NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@/lib/auth/validation";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { generateRawToken, hashToken, RESET_TOKEN_TTL_MS } from "@/lib/auth/token";
import { checkRateLimit, rateLimitHeaders, getClientIp } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

// Generic response — anti-enumeration: always identical regardless of
// whether the email exists, is verified, or has a pending reset.
function genericResponse() {
  return NextResponse.json<AuthResponse>(
    {
      success: true,
      message:
        "If an account with that email exists, you will receive a password reset link shortly.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  // ── Rate limit: 3 requests per hour per IP ─────────────────────────────────
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit({
    identifier:  ip,
    action:      "forgot_password",
    maxAttempts: 3,
    windowMs:    60 * 60 * 1000, // 1 hour
  });

  if (ipLimit.limited) {
    // Return the generic response with rate-limit headers — don't reveal
    // to the caller that they've been rate-limited.
    return NextResponse.json<AuthResponse>(
      { success: true, message: "If an account with that email exists, you will receive a password reset link shortly." },
      { status: 200, headers: rateLimitHeaders(ipLimit.retryAfter, 3) }
    );
  }

  try {
    const body   = await request.json();
    const result = ForgotPasswordSchema.safeParse(body);

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

    const { email } = result.data;

    // Per-email rate limit: 2 per hour
    const emailLimit = await checkRateLimit({
      identifier:  email,
      action:      "forgot_password_email",
      maxAttempts: 2,
      windowMs:    60 * 60 * 1000,
    });

    if (emailLimit.limited) return genericResponse(); // silent — anti-enumeration

    const user = await db.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, deletedAt: true },
    });

    // Deactivated accounts get the same generic response as unknown emails —
    // no reset mail is sent, and the caller learns nothing either way.
    if (!user || user.deletedAt !== null) return genericResponse();

    // Invalidate all existing unused reset tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    });

    const rawToken  = generateRawToken();
    const tokenHash = hashToken(rawToken);

    await db.passwordResetToken.create({
      data: {
        tokenHash,
        userId:    user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        used:      false,
      },
    });

    // Fire-and-forget — email failure must not block or reveal anything
    sendPasswordResetEmail(user.email, user.name, rawToken).catch((err) => {
      console.error("[auth/forgot-password] email failed:", err);
    });

    return genericResponse();
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return genericResponse(); // never reveal errors to caller
  }
}
