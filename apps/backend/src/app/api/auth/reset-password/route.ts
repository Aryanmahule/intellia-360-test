import { NextRequest, NextResponse } from "next/server";
import { ResetPasswordSchema } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/hash";
import { hashToken } from "@/lib/auth/token";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const result = ResetPasswordSchema.safeParse(body);

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

    const { token: rawToken, password } = result.data;
    const tokenHash = hashToken(rawToken);

    // ── Look up by hash ─────────────────────────────────────────────────────
    const resetToken = await db.passwordResetToken.findUnique({
      where:   { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // ── Hash new password + mark token used atomically ──────────────────────
    const hashed = await hashPassword(password);
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data:  { password: hashed },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data:  { used: true },
      }),
    ]);

    return NextResponse.json<AuthResponse>(
      { success: true, message: "Password reset successfully. You can now log in." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
