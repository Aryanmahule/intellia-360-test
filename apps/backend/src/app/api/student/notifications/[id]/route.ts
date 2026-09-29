import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { formatRelativeTime } from "@/lib/student/notifications";
import type { StudentNotificationDTO } from "@/lib/student/notifications";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/student/notifications/[id] — update read status of one notification
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Notification ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
        { status: 422 }
      );
    }

    // Verify ownership
    const existing = await db.notification.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!existing) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Notification not found" },
        { status: 404 }
      );
    }

    // Toggle if isRead not explicitly specified
    const nextIsRead =
      typeof parsed.data.isRead === "boolean" ? parsed.data.isRead : !existing.isRead;

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: nextIsRead },
    });

    const data: StudentNotificationDTO = {
      id: updated.id,
      type: updated.type as StudentNotificationDTO["type"],
      tabCategory: updated.tabCategory as StudentNotificationDTO["tabCategory"],
      icon: updated.icon,
      iconBg: updated.iconBg,
      title: updated.title,
      description: updated.description,
      timestamp: formatRelativeTime(updated.createdAt),
      isRead: updated.isRead,
      categoryTag: updated.categoryTag,
      actionUrl: updated.actionUrl ?? undefined,
      actionText: updated.actionText ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    };

    return NextResponse.json<AuthResponse<StudentNotificationDTO>>(
      { success: true, message: "Notification updated", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications/[id] PATCH]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE /api/student/notifications/[id] — delete one notification
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.notification.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!existing) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Notification not found" },
        { status: 404 }
      );
    }

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json<AuthResponse<{ id: string }>>(
      { success: true, message: "Notification deleted", data: { id } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/notifications/[id] DELETE]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
