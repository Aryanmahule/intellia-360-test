import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/auth/token";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { AuthResponse, AuthUser } from "@intellia360/shared/types/auth";

/**
 * POST /api/auth/verify-email
 * Body: { token: string }   — the raw token from the email link
 *
 * Flow:
 *   1. Hash the submitted token.
 *   2. Look up the matching EmailVerificationToken.
 *   3. Validate: not used, not expired.
 *   4. Atomically: mark token used + set user.emailVerified = true.
 *   5. Issue a session cookie so the user is immediately logged in.
 *   6. Return the AuthUser.
 */
export async function POST(request: NextRequest) {
  try {
    const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
    const raw   = typeof body.token === "string" ? body.token.trim() : "";

    if (!raw) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Verification token is required" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(raw);

    // ── Look up token ───────────────────────────────────────────────────────
    const record = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (record.used) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "This verification link has already been used. Please log in." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "This verification link has expired. Please request a new one.",
          errors: { token: ["expired"] },
        },
        { status: 400 }
      );
    }

    if (record.user.emailVerified) {
      // Already verified — just log them in
      const user: AuthUser = {
        id:            record.user.id,
        name:          record.user.name,
        email:         record.user.email,
        role:          record.user.role,
        emailVerified: record.user.emailVerified,
        createdAt:     record.user.createdAt.toISOString(),
        updatedAt:     record.user.updatedAt.toISOString(),
      };
      const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
      await setSessionCookie(token);
      return NextResponse.json<AuthResponse<AuthUser>>(
        { success: true, message: "Email already verified. You are now logged in.", data: user },
        { status: 200 }
      );
    }

    // ── Verify atomically ───────────────────────────────────────────────────
    const updatedUser = await db.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { tokenHash },
        data:  { used: true },
      });

      // Invalidate any remaining unused verification tokens for this user
      await tx.emailVerificationToken.updateMany({
        where: { userId: record.userId, used: false },
        data:  { used: true },
      });

      return tx.user.update({
        where: { id: record.userId },
        data:  { emailVerified: true },
      });
    });

    // ── Issue session (auto-login after verification) ───────────────────────
    const user: AuthUser = {
      id:            updatedUser.id,
      name:          updatedUser.name,
      email:         updatedUser.email,
      role:          updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      createdAt:     updatedUser.createdAt.toISOString(),
      updatedAt:     updatedUser.updatedAt.toISOString(),
    };

    const jwtToken = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    await setSessionCookie(jwtToken);

    return NextResponse.json<AuthResponse<AuthUser>>(
      { success: true, message: "Email verified! You are now logged in.", data: user },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/verify-email]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
