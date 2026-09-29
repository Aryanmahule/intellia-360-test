/**
 * Secure token utilities for email verification and password-reset flows.
 *
 * Pattern:
 *   1. Generate a cryptographically random raw token (never stored).
 *   2. Store SHA-256(raw_token) in the database.
 *   3. Send the raw token to the user via email.
 *   4. On verify: hash the submitted token and look it up by hash.
 *
 * This means even a full DB dump cannot be used to verify emails / reset
 * passwords without the original email.
 */

import crypto from "crypto";

/** Length of the raw token in bytes (produces 64-char hex string). */
const TOKEN_BYTES = 32;

/** Generate a raw cryptographically-random token (hex). */
export function generateRawToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/** Compute the SHA-256 hash of a raw token (stored in DB). */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Verification token validity window. */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RESET_TOKEN_TTL_MS  =      60 * 60 * 1000; //  1 hour
