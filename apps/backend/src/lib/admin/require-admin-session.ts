import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { JWTPayload, UserRole, AuthResponse } from "@intellia360/shared/types/auth";

export interface AdminSession {
  userId: string;
  role:   UserRole;
  name:   string;
  email:  string;
}

/**
 * Guard for ADMIN-only API routes.
 * Returns { session, errorResponse: null } or { session: null, errorResponse }.
 */
export async function requireAdminSession(): Promise<
  | { session: AdminSession; errorResponse: null }
  | { session: null;         errorResponse: NextResponse }
> {
  const payload: JWTPayload | null = await getSession();

  if (!payload) {
    return {
      session: null,
      errorResponse: NextResponse.json<AuthResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (payload.role !== "ADMIN") {
    return {
      session: null,
      errorResponse: NextResponse.json<AuthResponse>(
        { success: false, message: "Forbidden — administrator access required" },
        { status: 403 }
      ),
    };
  }

  return {
    session: {
      userId: payload.sub,
      role:   payload.role,
      name:   payload.name,
      email:  payload.email,
    },
    errorResponse: null,
  };
}
