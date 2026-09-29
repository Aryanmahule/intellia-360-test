import { NextRequest, NextResponse } from "next/server";
import { UnsafePathError } from "@/lib/content/curriculum-store";
import { resolveLessonResources } from "@/lib/student/lesson-resources";

/**
 * GET /api/student/videos?lessonId=<id>&grade=<gradeId>
 *
 * Topic-wise lesson videos. Mirrors /api/student/edunotes: an empty list is a
 * normal answer (200) so the page can show its "no videos yet" state.
 *
 * Resolved by src/lib/student/lesson-resources.ts — the Editor's video URL
 * first, then the curated registry, then the curriculum's actionCards.video —
 * so this page and the lesson screen always agree.
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

    const { video } = await resolveLessonResources(
      lessonId,
      grade,
      request.nextUrl.origin
    );
    const videos = video.videos;

    return NextResponse.json(
      {
        success: true,
        lessonId,
        grade,
        count: videos.length,
        videos,
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

    console.error("Error fetching lesson videos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error while fetching lesson videos",
      },
      { status: 500 }
    );
  }
}
