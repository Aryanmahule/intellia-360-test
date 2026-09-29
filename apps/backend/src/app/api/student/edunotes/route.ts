import { NextRequest, NextResponse } from "next/server";
import { UnsafePathError } from "@/lib/content/curriculum-store";
import { resolveLessonResources } from "@/lib/student/lesson-resources";

/**
 * EduNotes metadata. The source is resolved by
 * src/lib/student/lesson-resources.ts — the Editor's EduNotes URL first, then
 * the curriculum, then EDUNOTES_REGISTRY.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");
    const grade = searchParams.get("grade") || "grade1";

    if (!lessonId) {
      return NextResponse.json(
        {
          success: false,
          message: "lessonId parameter is required",
        },
        { status: 400 }
      );
    }

    const { eduNotes: edunote } = await resolveLessonResources(
      lessonId,
      grade,
      request.nextUrl.origin
    );

    if (!edunote) {
      return NextResponse.json(
        {
          success: false,
          message: "EduNotes not available for this lesson",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        lessonId,
        fileId: edunote.fileId,
        fileName: edunote.fileName,
        previewUrl: edunote.fileId
          ? `https://drive.google.com/file/d/${edunote.fileId}/preview`
          : edunote.url,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof UnsafePathError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    console.error("Error fetching EduNotes:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error while fetching EduNotes",
      },
      { status: 500 }
    );
  }
}
