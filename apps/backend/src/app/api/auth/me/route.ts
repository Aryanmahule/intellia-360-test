import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import type { AuthResponse, AuthUser } from "@intellia360/shared/types/auth";

export async function GET() {
  try {
    const payload = await getSession();
    if (!payload) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: payload.sub },
    });

    // A session cookie outlives deactivation, so the account state is
    // re-checked on every session resolve rather than only at login.
    if (!dbUser || dbUser.deletedAt !== null) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "User not found" },
        { status: 401 }
      );
    }

    const user: AuthUser = {
      id:            dbUser.id,
      name:          dbUser.name,
      email:         dbUser.email,
      role:          dbUser.role,
      emailVerified: dbUser.emailVerified,
      requestedRole: dbUser.requestedRole,
      createdAt:     dbUser.createdAt.toISOString(),
      updatedAt:     dbUser.updatedAt.toISOString(),
    };

    // The role travels in the signed session token, which proxy.ts and the API
    // guards trust. When an administrator changes it — for example approving
    // an Editor request — the token is re-issued here, so the change reaches
    // the user within seconds instead of at their next sign-in.
    if (
      payload.role !== dbUser.role ||
      payload.name !== dbUser.name ||
      payload.email !== dbUser.email
    ) {
      const refreshed = await signToken({
        sub:   dbUser.id,
        email: dbUser.email,
        role:  dbUser.role,
        name:  dbUser.name,
      });
      await setSessionCookie(refreshed);
    }

    return NextResponse.json<AuthResponse<AuthUser>>(
      { success: true, message: "OK", data: user },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/me]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
