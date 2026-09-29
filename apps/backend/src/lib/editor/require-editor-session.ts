import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { JWTPayload, UserRole, AuthResponse } from "@intellia360/shared/types/auth";

const EDITOR_ROLES: UserRole[] = ["EDITOR", "ADMIN"];

export interface EditorSession {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
}

export async function requireEditorSession(): Promise<
  | { session: EditorSession; errorResponse: null }
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

  if (!EDITOR_ROLES.includes(payload.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json<AuthResponse>(
        { success: false, message: "Forbidden — editor access required" },
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
