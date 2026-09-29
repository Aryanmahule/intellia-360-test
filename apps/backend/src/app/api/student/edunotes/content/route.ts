import { NextRequest, NextResponse } from "next/server";
import { UnsafePathError } from "@/lib/content/curriculum-store";
import { resolveLessonResources } from "@/lib/student/lesson-resources";

/**
 * EduNotes PDF bytes, served same-origin so EduNotesBookViewer (react-pdf)
 * can load them. The source is resolved by src/lib/student/lesson-resources.ts:
 * a Google Drive file is downloaded by id; any other PDF URL is fetched as-is.
 *
 * The PDF is streamed through rather than buffered: the books are tens of MB,
 * which kept the whole file in memory and exceeds the response size a
 * serverless function may return in one piece.
 */

/** Fetches the PDF, retrying once when the connection fails or the source answers 5xx. */
async function fetchPdf(url: string): Promise<Response> {
  try {
    const response = await fetch(url, { redirect: "follow", cache: "no-store" });
    if (response.status < 500) return response;
    console.warn("EduNotes source answered", response.status, "— retrying once");
  } catch (error) {
    console.warn(
      "EduNotes source fetch failed — retrying once:",
      error instanceof Error ? error.message : error
    );
  }
  return fetch(url, { redirect: "follow", cache: "no-store" });
}

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

    if (!edunote || (!edunote.fileId && !edunote.url)) {
      return NextResponse.json(
        {
          success: false,
          message: "EduNotes not available for this lesson",
        },
        { status: 404 }
      );
    }

    const sourceUrl = edunote.fileId
      ? `https://drive.google.com/uc?export=download&id=${edunote.fileId}`
      : new URL(edunote.url as string, request.url).toString();

    const sourceResponse = await fetchPdf(sourceUrl);

    if (!sourceResponse.ok || !sourceResponse.body) {
      console.error(
        "EduNotes source fetch failed:",
        sourceResponse.status,
        sourceResponse.statusText
      );

      return NextResponse.json(
        {
          success: false,
          message: edunote.fileId
            ? "Unable to fetch EduNotes PDF from Google Drive"
            : "Unable to fetch EduNotes PDF",
        },
        { status: 502 }
      );
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${edunote.fileName}"`,
      "Cache-Control": "private, max-age=300",
    });

    // The decoded body no longer matches the upstream length when it was compressed.
    const length = sourceResponse.headers.get("content-length");
    if (length && !sourceResponse.headers.get("content-encoding")) {
      headers.set("Content-Length", length);
    }

    return new NextResponse(sourceResponse.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof UnsafePathError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    console.error("EduNotes content API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error while loading EduNotes",
      },
      { status: 500 }
    );
  }
}
