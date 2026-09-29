import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { formatRelativeTime } from "@/lib/student/notifications";
import type { StudentNotificationDTO } from "@/lib/student/notifications";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface NotificationsResponseData {
  notifications: StudentNotificationDTO[];
  unreadCount: number;
}

// GET /api/student/notifications — fetch all notifications for the authenticated student
export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const records = await db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    const notifications: StudentNotificationDTO[] = records.map((n) => ({
      id: n.id,
      type: n.type as StudentNotificationDTO["type"],
      tabCategory: n.tabCategory as StudentNotificationDTO["tabCategory"],
      icon: n.icon,
      iconBg: n.iconBg,
      title: n.title,
      description: n.description,
      timestamp: formatRelativeTime(n.createdAt),
      isRead: n.isRead,
      categoryTag: n.categoryTag,
      actionUrl: n.actionUrl ?? undefined,
      actionText: n.actionText ?? undefined,
      createdAt: n.createdAt.toISOString(),
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json<AuthResponse<StudentNotificationDTO[]> & { unreadCount: number }>(
      {
        success: true,
        message: "OK",
        data: notifications,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE /api/student/notifications — clear all notifications for the authenticated student
export async function DELETE() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const result = await db.notification.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json<AuthResponse<{ count: number }>>(
      {
        success: true,
        message: "All notifications cleared",
        data: { count: result.count },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications DELETE]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
