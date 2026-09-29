import { cookies } from "next/headers";
import type { JWTPayload } from "@intellia360/shared/types/auth";
import { verifyToken } from "./jwt";

export const SESSION_COOKIE = "intellia_session";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/**
 * Set the HTTP-only session cookie after successful login.
 */
export async function setSessionCookie(token: string, rememberMe = false): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? SEVEN_DAYS : undefined, // session cookie if not rememberMe
  });
}

/**
 * Clear the session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Read and verify the session cookie from an incoming request.
 * Returns the decoded payload or null.
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifyToken(token);
}
