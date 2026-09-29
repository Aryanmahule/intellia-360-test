/**
 * GET  /api/editor/lessons/[gradeId]       — list all lessons for a grade
 * POST /api/editor/lessons/[gradeId]       — create a new lesson
 *
 * Storage goes through src/lib/content/lesson-store.ts, so on a read-only host
 * the list includes lessons that exist only in the database mirror and a new
 * lesson is stored there instead of failing on the file write.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import {
  assertGradeId,
  assertLessonId,
  storePath,
  UnsafePathError,
} from "@/lib/content/curriculum-store";
import {
  LessonStoreError,
  listLessons,
  readLesson,
  saveLesson,
} from "@/lib/content/lesson-store";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

function fail(message: string, status: number) {
  return NextResponse.json<AuthResponse>({ success: false, message }, { status });
}

/** Turns anything thrown while handling lessons into a JSON response, never a bare 500. */
function failure(err: unknown) {
  if (err instanceof UnsafePathError) return fail(err.message, 400);
  if (err instanceof LessonStoreError) return fail(err.message, err.status);
  console.error("[editor/lessons] unexpected error", err);
  return fail("Unexpected server error while handling lessons.", 500);
}

export interface LessonSummary {
  id: string;
  title: string;
  grade: string;
  chapterId: string;
  estimatedMinutes: number;
  locked: boolean;
  completed: boolean;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gradeId: string }> }
) {
  const { errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const gradeId = assertGradeId((await params).gradeId);
    const lessons: LessonSummary[] = (await listLessons(gradeId)).map(({ lessonId, content: raw }) => ({
      id:               (raw?.id as string | undefined) ?? lessonId,
      title:            (raw?.title as string | undefined) ?? `${lessonId}.json`,
      grade:            (raw?.grade as string | undefined) ?? gradeId,
      chapterId:        (raw?.chapterId as string | undefined) ?? "",
      estimatedMinutes: (raw?.estimatedMinutes as number | undefined) ?? 0,
      locked:           (raw?.locked as boolean | undefined) ?? false,
      completed:        (raw?.completed as boolean | undefined) ?? false,
    }));

    return NextResponse.json<AuthResponse<LessonSummary[]>>(
      { success: true, message: lessons.length ? "OK" : "No lessons found", data: lessons },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gradeId: string }> }
) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const gradeId = assertGradeId((await params).gradeId);

    const body = await request.json().catch(() => ({}));
    const rawId: string = String(body.id ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!rawId) return fail("id is required", 422);

    // The slug becomes a filename, so it gets the same validation as a route param.
    const lessonId = assertLessonId(rawId);
    const ref = { gradeId, lessonId };

    if (await readLesson(ref)) return fail(`Lesson ${lessonId} already exists`, 409);

    const lesson = {
      id:           lessonId,
      title:        body.title ?? lessonId,
      description:  body.description ?? "",
      chapterId:    body.chapterId ?? "chap_1",
      chapterTitle: body.chapterTitle ?? "Chapter 1",
      grade:        gradeId,
      estimatedMinutes: body.estimatedMinutes ?? 20,
      completed:    false,
      locked:       body.locked ?? false,
      heroVisualizer: body.heroVisualizer ?? "place-value",
      heroVisualizerData: body.heroVisualizerData ?? { number: 123 },
      // A module is only enabled when it was given a link — an enabled module
      // with no link fails the editor's validation on the first save.
      modules: {
        eduNotes:          { enabled: !!body.eduNotesUrl,     url: body.eduNotesUrl ?? "" },
        architectureModule:{ enabled: !!body.architectureUrl, url: body.architectureUrl ?? "" },
        videoLesson:       { enabled: !!body.videoUrl,        url: body.videoUrl ?? "" },
        practiceModule:    { enabled: !!body.practiceUrl,     url: body.practiceUrl ?? "" },
      },
      previousLesson: null,
      nextLesson:     null,
    };

    const saved = await saveLesson(ref, lesson, session.userId);

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "lesson.create",
      entityType: "CurriculumDocument",
      entityId: storePath(gradeId, "lessons", `${lessonId}.json`),
      summary: `Created lesson ${lessonId} (${gradeId})`,
      after: lesson,
      request,
    });

    return NextResponse.json<AuthResponse<typeof lesson>>(
      {
        success: true,
        message: saved.storedIn === "file" ? "Lesson created" : "Lesson created in the database",
        data: lesson,
      },
      { status: 201 }
    );
  } catch (err) {
    return failure(err);
  }
}
