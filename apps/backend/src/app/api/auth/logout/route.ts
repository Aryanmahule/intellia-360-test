import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json<AuthResponse>(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/logout]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
