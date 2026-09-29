/**
 * JWT utilities — uses `jose` exclusively.
 *
 * jose is the only JWT library we need:
 *   • Works in both the Node.js runtime (API routes) and the Edge runtime (proxy.ts).
 *   • Previously jsonwebtoken was used for API routes and jose for the Edge middleware,
 *     creating a split dependency. Both produced compatible HS256 tokens anyway,
 *     so consolidating to jose removes jsonwebtoken and @types/jsonwebtoken entirely.
 *
 * Security contract
 * ─────────────────
 * • AUTH_JWT_SECRET must be set in every environment.
 *   Missing or < 32 chars → hard crash at module load.
 * • Minimum 256-bit entropy (32 random bytes / 64-char hex).
 *   Generate: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
 */

import { SignJWT, jwtVerify, decodeJwt, type JWTPayload as JosePayload } from "jose";
import type { JWTPayload } from "@intellia360/shared/types/auth";

// ── Secret resolution ─────────────────────────────────────────────────────────

function resolveSecret(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET;
  if (!s || s.trim().length === 0) {
    throw new Error(
      "[auth/jwt] AUTH_JWT_SECRET is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\""
    );
  }
  if (s.length < 32) {
    throw new Error(
      "[auth/jwt] AUTH_JWT_SECRET is too short (minimum 32 characters). " +
        "Use at least 64 characters of random data."
    );
  }
  return new TextEncoder().encode(s);
}

// Module-level: crashes at startup if misconfigured, never mid-request.
const secret = resolveSecret();

const expiresIn = process.env.AUTH_JWT_EXPIRES_IN ?? "7d";

// ── Token operations ──────────────────────────────────────────────────────────

/** Sign a JWT for a user session. Returns the signed token string. */
export async function signToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verify and decode a JWT.
 * Returns the payload on success, null on any failure (expired, tampered, etc.).
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Decode WITHOUT verification — only for reading non-sensitive fields like
 * `exp` for UI display. Never trust decoded data for access decisions.
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return decodeJwt(token) as unknown as JWTPayload;
  } catch {
    return null;
  }
}
