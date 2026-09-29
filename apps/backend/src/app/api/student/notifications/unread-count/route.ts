import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface UnreadCountResponse {
  unreadCount: number;
}

// GET /api/student/notifications/unread-count — get count of unread notifications
export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const unreadCount = await db.notification.count({
      where: {
        userId: session.userId,
        isRead: false,
      },
    });

    return NextResponse.json<AuthResponse<UnreadCountResponse>>(
      {
        success: true,
        message: "OK",
        data: { unreadCount },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications/unread-count GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
