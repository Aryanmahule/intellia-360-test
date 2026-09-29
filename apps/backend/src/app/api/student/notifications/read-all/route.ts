import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

// PATCH /api/student/notifications/read-all — mark all notifications as read for current student
export async function PATCH() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const result = await db.notification.updateMany({
      where: {
        userId: session.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json<AuthResponse<{ count: number }>>(
      {
        success: true,
        message: "All notifications marked as read",
        data: { count: result.count },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications/read-all PATCH]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
