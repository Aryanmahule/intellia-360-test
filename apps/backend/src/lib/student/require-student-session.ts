import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { JWTPayload, UserRole } from "@intellia360/shared/types/auth";
import type { AuthResponse } from "@intellia360/shared/types/auth";

/** Roles allowed to access student-facing API routes. */
const STUDENT_ROLES: readonly UserRole[] = ["STUDENT", "PARENT", "ADMIN"];

export interface StudentSession {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
}

/**
 * Reads and verifies the session cookie, then checks the caller has a
 * student-accessible role (STUDENT, PARENT, or ADMIN).
 *
 * Returns either:
 *   { session: StudentSession, errorResponse: null }   — authenticated
 *   { session: null, errorResponse: NextResponse }     — should be returned immediately
 */
export async function requireStudentSession(): Promise<
  | { session: StudentSession; errorResponse: null }
  | { session: null; errorResponse: NextResponse }
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

  if (!STUDENT_ROLES.includes(payload.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json<AuthResponse>(
        { success: false, message: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    session: {
      userId: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    },
    errorResponse: null,
  };
}
