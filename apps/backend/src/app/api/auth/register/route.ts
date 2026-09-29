/**
 * POST /api/auth/register
 *
 * Role policy
 * ───────────
 * Every new account is created with role = STUDENT regardless of what the
 * user selected in the UI. The UI selection is stored as `requestedRole` so
 * an admin can review it and upgrade the account when appropriate.
 *
 * This prevents:
 *   • Self-assignment of privileged roles (ADMIN, EDITOR, TEACHER, etc.)
 *   • One email being used to register with multiple different roles
 *
 * Admin role can ONLY be granted by an existing ADMIN via
 * PATCH /api/admin/users/[userId]/role
 */
import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/auth/validation";
import { DEFAULT_ROLE } from "@intellia360/shared/auth/roles";
import { hashPassword } from "@/lib/auth/hash";
import { sendVerificationEmail } from "@/lib/auth/email";
import { generateRawToken, hashToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/token";
import { checkRateLimit, rateLimitHeaders, getClientIp } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { requireEmailVerification } from "@/lib/auth/verification-policy";
import type { AuthResponse, AuthUser } from "@intellia360/shared/types/auth";

export async function POST(request: NextRequest) {
  // ── IP rate limit ─────────────────────────────────────────────────────────
  // 10 signups per hour per IP. Runs before any parsing or DB work so it
  // cannot be bypassed, and so a script cannot use this endpoint to send
  // verification emails to arbitrary addresses.
  const ip = getClientIp(request);
  const ipLimit = await checkRateLimit({
    identifier: ip,
    action: "register",
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (ipLimit.limited) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: `Too many sign-up attempts. Please try again in ${ipLimit.retryAfter} seconds.`,
      },
      { status: 429, headers: rateLimitHeaders(ipLimit.retryAfter, 10) }
    );
  }

  try {
    const body = await request.json();

    // ── Validate ────────────────────────────────────────────────────────────
    const result = RegisterSchema.safeParse(body);
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

    const { name, email, password, requestedRole, grade, school, subject } = result.data;

    // ── Duplicate-email check ───────────────────────────────────────────────
    // One email → one account only. Re-registering with a different role
    // is not allowed — existing users must ask an admin to change their role.
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "An account with this email already exists. " +
            "If you need a different role, please contact an administrator.",
          errors: { email: ["An account with this email already exists"] },
        },
        { status: 409 }
      );
    }

    // Emailed links are only required when the policy says so (see
    // lib/auth/verification-policy.ts); otherwise the account is verified now.
    const verifyByEmail = requireEmailVerification();

    const hashedPassword = await hashPassword(password);
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    // ── Transactional create ────────────────────────────────────────────────
    // role is ALWAYS STUDENT — requestedRole is stored for admin review.
    const createdUser = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: DEFAULT_ROLE,        // ← always base plan
          requestedRole: requestedRole ?? "STUDENT",
          emailVerified: !verifyByEmail,
        },
      });

      // ── Profiles ────────────────────────────────────────────────────────
      // The account is created as STUDENT no matter what was requested, so a
      // studentProfile is ALWAYS required — every student-facing page and API
      // reads it. Keying this off `requestedRole` left TEACHER / SCHOOL /
      // EDITOR sign-ups as STUDENT-role accounts with no studentProfile,
      // which broke their dashboard the moment they logged in.
      await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          grade: grade || "grade1",
          school,
          xpPoints: 0,
          learningGems: 0,
          streakDays: 1,
          lastActiveDate: new Date(),
        },
      });

      // Teaching intent additionally keeps the school / subject hints the user
      // typed, so an admin upgrading them to TEACHER or SCHOOL keeps the data.
      if (requestedRole === "TEACHER" || requestedRole === "SCHOOL") {
        await tx.teacherProfile.create({
          data: { userId: newUser.id, schoolName: school, subject },
        });
      }

      if (verifyByEmail) {
        await tx.emailVerificationToken.create({
          data: { tokenHash, userId: newUser.id, expiresAt, used: false },
        });
      }

      return newUser;
    });

    // ── Instant verification ──────────────────────────────────────────────
    // No email round-trip: the account is already verified, so the new user
    // is signed in straight away. The register page shows a short
    // "verifying" step and then opens their dashboard.
    if (!verifyByEmail) {
      const user: AuthUser = {
        id:            createdUser.id,
        name:          createdUser.name,
        email:         createdUser.email,
        role:          createdUser.role,
        emailVerified: createdUser.emailVerified,
        requestedRole: createdUser.requestedRole,
        createdAt:     createdUser.createdAt.toISOString(),
        updatedAt:     createdUser.updatedAt.toISOString(),
      };

      const sessionToken = await signToken({
        sub:   user.id,
        email: user.email,
        role:  user.role,
        name:  user.name,
      });
      await setSessionCookie(sessionToken);

      const upgradePending = requestedRole !== DEFAULT_ROLE;

      return NextResponse.json<AuthResponse<{ user: AuthUser; verified: boolean; emailSent: boolean }>>(
        {
          success: true,
          message: upgradePending
            ? `Account created and verified. Your ${requestedRole} access is waiting for an administrator's approval.`
            : "Account created and verified.",
          data: { user, verified: true, emailSent: false },
        },
        { status: 201 }
      );
    }

    // ── Send verification email ─────────────────────────────────────────────
    // We do NOT issue a session cookie here — the user must verify first.
    // A delivery failure does not roll the account back (the user can ask for
    // a resend), but it IS reported so the UI stops telling people to check an
    // inbox that will never receive anything.
    let emailSent = true;
    try {
      await sendVerificationEmail(email, name, rawToken);
    } catch (emailErr) {
      emailSent = false;
      // Message only — never the token, the address, or the payload.
      console.error(
        "[auth/register] verification email failed:",
        emailErr instanceof Error ? emailErr.message : "unknown error"
      );
    }

    return NextResponse.json<AuthResponse<{ userId: string; emailSent: boolean }>>(
      {
        success: true,
        message: emailSent
          ? "Account created! Check your inbox for a verification link. " +
            "Your account starts on the Student plan — an admin can upgrade your role once verified."
          : "Account created, but we could not send the verification email. " +
            "Use the resend link below to try again.",
        data: { userId: createdUser.id, emailSent },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
