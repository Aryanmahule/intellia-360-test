/**
 * Google OAuth 2.0 — ID Token verification endpoint
 *
 * Flow (no server-side redirect needed):
 *   1. Client loads the Google Identity Services script and calls
 *      `google.accounts.id.initialize({ client_id, callback })`.
 *   2. Google calls `callback` with a `credential` (a signed JWT / ID token).
 *   3. Client POSTs `{ credential }` to this endpoint.
 *   4. We verify the token with Google's public keys via `jose` (Edge-safe).
 *   5. Extract email + name → upsert User → issue our own session cookie.
 *
 * Env vars required:
 *   GOOGLE_CLIENT_ID   — from Google Cloud Console → Credentials
 *   GOOGLE_CLIENT_SECRET — only needed if you use server-side code flow;
 *                          for ID-token-only flow only CLIENT_ID is required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import type { AuthResponse, AuthUser } from "@intellia360/shared/types/auth";

// Google's public key endpoint — cached by `jose` automatically
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

/** Signals that the matched account is deactivated; aborts the upsert transaction. */
class DeactivatedAccountError extends Error {
  constructor() {
    super("Account deactivated");
    this.name = "DeactivatedAccountError";
  }
}

interface GoogleClaims {
  sub:            string;   // Google user ID
  email:          string;
  email_verified: boolean;
  name:           string;
  picture?:       string;
  given_name?:    string;
  family_name?:   string;
}

export async function POST(request: NextRequest) {
  // ── Rate limit: 20 per 15 min per IP ──────────────────────────────────────
  const ip = getClientIp(request);
  const rl = await checkRateLimit({
    identifier:  ip,
    action:      "google_oauth",
    maxAttempts: 20,
    windowMs:    15 * 60 * 1000,
  });
  if (rl.limited) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(rl.retryAfter, 20) }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const credential = typeof body.credential === "string" ? body.credential.trim() : "";

  if (!credential) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Missing Google credential token." },
      { status: 400 }
    );
  }

  // ── Verify Google ID token ─────────────────────────────────────────────────
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("[auth/google] GOOGLE_CLIENT_ID is not set");
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Google sign-in is not configured on this server." },
      { status: 503 }
    );
  }

  let claims: GoogleClaims;
  try {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer:   ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    claims = payload as unknown as GoogleClaims;
  } catch (err) {
    console.error("[auth/google] token verification failed:", err);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Invalid or expired Google credential." },
      { status: 401 }
    );
  }

  // Google tokens must have a verified email
  if (!claims.email_verified) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Your Google account email is not verified." },
      { status: 400 }
    );
  }

  // ── Upsert user ────────────────────────────────────────────────────────────
  // If the email already exists with a password account, link them together
  // (set emailVerified=true, don't change the password or role).
  // If no account exists, create one as STUDENT (they can change role later).
  let dbUser;
  try {
    dbUser = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: claims.email },
      });

      if (existing) {
        // A deactivated account must not be able to sign in through the Google
        // button either. Thrown inside the transaction so nothing is written.
        if (existing.deletedAt !== null) throw new DeactivatedAccountError();

        // Merge: mark email as verified (Google has verified it for us)
        return tx.user.update({
          where: { id: existing.id },
          data:  { emailVerified: true },
        });
      }

      // New user via Google — no password, email is already verified
      const newUser = await tx.user.create({
        data: {
          email:         claims.email,
          name:          claims.name,
          password:      "", // Google users authenticate via token, not password
          role:          "STUDENT",
          emailVerified: true, // Google has verified it
        },
      });

      // Auto-create StudentProfile
      await tx.studentProfile.create({
        data: {
          userId:        newUser.id,
          grade:         "grade1",
          xpPoints:      0,
          learningGems:  0,
          streakDays:    1,
          lastActiveDate: new Date(),
        },
      });

      return newUser;
    });
  } catch (err) {
    if (err instanceof DeactivatedAccountError) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "This account has been deactivated. Please contact an administrator.",
        },
        { status: 403 }
      );
    }
    console.error("[auth/google] user upsert failed:", err);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }

  // ── Issue session ──────────────────────────────────────────────────────────
  const user: AuthUser = {
    id:            dbUser.id,
    name:          dbUser.name,
    email:         dbUser.email,
    role:          dbUser.role,
    emailVerified: dbUser.emailVerified,
    createdAt:     dbUser.createdAt.toISOString(),
    updatedAt:     dbUser.updatedAt.toISOString(),
  };

  const jwtToken = await signToken({
    sub:   user.id,
    email: user.email,
    role:  user.role,
    name:  user.name,
  });
  await setSessionCookie(jwtToken, /* rememberMe */ true);

  return NextResponse.json<AuthResponse<AuthUser>>(
    { success: true, message: "Signed in with Google", data: user },
    { status: 200 }
  );
}
