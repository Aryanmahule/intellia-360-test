import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { JWTPayload, UserRole, AuthResponse } from "@intellia360/shared/types/auth";

/**
 * Roles allowed to reach teacher-facing API routes.
 *
 * SCHOOL and ADMIN are included so a school administrator can manage a
 * teacher's classes, matching the role checks already used by the teacher
 * console pages.
 */
const TEACHER_ROLES: readonly UserRole[] = ["TEACHER", "SCHOOL", "ADMIN"];

export interface TeacherSession {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  /** TeacherProfile.id — null when the account has no profile row yet. */
  teacherProfileId: string | null;
  /** ClassGroup ids this teacher owns. Empty for ADMIN/SCHOOL without classes. */
  classIds: string[];
}

/**
 * Guard for teacher API routes.
 *
 * Resolves the caller's own classes alongside the session, because every
 * teacher route needs them: an assignment may only ever be created against,
 * or read from, a class the caller actually owns. Routes that skip this end
 * up trusting a classId straight from the request body.
 */
export async function requireTeacherSession(): Promise<
  | { session: TeacherSession; errorResponse: null }
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

  if (!TEACHER_ROLES.includes(payload.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json<AuthResponse>(
        { success: false, message: "Forbidden — teacher access required" },
        { status: 403 }
      ),
    };
  }

  const profile = await db.teacherProfile.findUnique({
    where: { userId: payload.sub },
    select: { id: true, classes: { select: { id: true } } },
  });

  return {
    session: {
      userId: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      teacherProfileId: profile?.id ?? null,
      classIds: profile?.classes.map((c) => c.id) ?? [],
    },
    errorResponse: null,
  };
}
