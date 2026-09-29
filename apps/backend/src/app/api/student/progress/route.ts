import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface ProgressResponse {
  completedLessons: string[];
  completedActivities: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get("grade") ?? undefined;

    const [lessons, activities] = await Promise.all([
      db.completedLesson.findMany({
        where: {
          userId: session.userId,
          ...(grade ? { grade } : {}),
        },
        select: { lessonId: true },
        orderBy: { completedAt: "asc" },
      }),
      db.completedActivity.findMany({
        where: { userId: session.userId },
        select: { lessonId: true, activityType: true },
        orderBy: { completedAt: "asc" },
      }),
    ]);

    const data: ProgressResponse = {
      // Simple arrays of IDs — same shape the StudentContext already consumes
      completedLessons: lessons.map((l) => l.lessonId),
      // Compound key "lessonId_activityType" — matches the StudentContext key format
      completedActivities: activities.map((a) => `${a.lessonId}_${a.activityType}`),
    };

    return NextResponse.json<AuthResponse<ProgressResponse>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/progress]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
