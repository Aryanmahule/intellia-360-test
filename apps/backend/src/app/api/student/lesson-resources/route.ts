/**
 * GET /api/student/lesson-resources?lessonId=<id>&grade=<gradeId>
 *
 * The Architecture URL, videos and EduNotes availability for one lesson in one
 * grade, resolved from the Editor's lesson data and the grade curriculum by
 * src/lib/student/lesson-resources.ts. Used by /student/lesson/[id].
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { UnsafePathError } from "@/lib/content/curriculum-store";
import {
  resolveLessonResources,
  type StudentLessonResources,
} from "@/lib/student/lesson-resources";

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireStudentSession();
  if (errorResponse) return errorResponse;

  const lessonId = request.nextUrl.searchParams.get("lessonId")?.trim();
  const grade = request.nextUrl.searchParams.get("grade")?.trim();

  if (!lessonId || !grade) {
    return NextResponse.json(
      { success: false, message: "lessonId and grade parameters are required" },
      { status: 400 }
    );
  }

  try {
    const { eduNotes, ...resources } = await resolveLessonResources(
      lessonId,
      grade,
      request.nextUrl.origin
    );

    const data: StudentLessonResources = {
      ...resources,
      eduNotes: { available: eduNotes !== null },
    };

    return NextResponse.json({ success: true, message: "OK", data }, { status: 200 });
  } catch (error) {
    if (error instanceof UnsafePathError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    console.error("Error resolving lesson resources:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error while loading the lesson" },
      { status: 500 }
    );
  }
}
