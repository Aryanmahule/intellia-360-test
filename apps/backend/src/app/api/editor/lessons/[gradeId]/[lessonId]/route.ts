/**
 * GET    /api/editor/lessons/[gradeId]/[lessonId]  — read a lesson JSON
 * PUT    /api/editor/lessons/[gradeId]/[lessonId]  — full overwrite
 * PATCH  /api/editor/lessons/[gradeId]/[lessonId]  — partial update
 * DELETE /api/editor/lessons/[gradeId]/[lessonId]  — delete a lesson
 *
 * Both route params end up in a filesystem path, so each is validated before
 * use. Storage goes through src/lib/content/lesson-store.ts, which keeps the
 * JSON files as the source of truth where they are writable and falls back to
 * the MongoDB mirror on read-only hosts — where every save used to fail with
 * an unhandled EROFS 500.
 *
 * Module links follow src/lib/content/lesson-modules.ts: a link is required
 * only while its module is enabled.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import { assertGradeId, assertLessonId, UnsafePathError } from "@/lib/content/curriculum-store";
import {
  deleteLesson,
  LessonStoreError,
  readLesson,
  saveLesson,
  type LessonContent,
  type LessonRef,
  type SavedLesson,
} from "@/lib/content/lesson-store";
import {
  LESSON_MODULE_KEYS,
  LESSON_MODULE_LABELS,
  normalizeLessonModules,
  validateLessonModules,
  type LessonModules,
} from "@intellia360/shared/content/lesson-modules";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ gradeId: string; lessonId: string }> };

function fail(message: string, status: number) {
  return NextResponse.json<AuthResponse>({ success: false, message }, { status });
}

/** Turns anything thrown while handling a lesson into a JSON response, never a bare 500. */
function failure(err: unknown) {
  if (err instanceof UnsafePathError) return fail(err.message, 400);
  if (err instanceof LessonStoreError) return fail(err.message, err.status);
  console.error("[editor/lessons] unexpected error", err);
  return fail("Unexpected server error while handling this lesson.", 500);
}

async function resolveRef(params: Params["params"]): Promise<LessonRef> {
  const raw = await params;
  return { gradeId: assertGradeId(raw.gradeId), lessonId: assertLessonId(raw.lessonId) };
}

function lessonPath(ref: LessonRef): string {
  return `${ref.gradeId}/lessons/${ref.lessonId}.json`;
}

async function readObjectBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

/**
 * Normalises module links, or returns the 422 to send back.
 * Disabled modules may leave their link empty; enabled ones may not.
 */
function checkModules(raw: unknown): { modules: LessonModules } | { response: NextResponse } {
  const modules = normalizeLessonModules(raw);
  const errors = validateLessonModules(modules);
  const failed = LESSON_MODULE_KEYS.filter((key) => errors[key]);
  if (failed.length === 0) return { modules };

  return {
    response: NextResponse.json<AuthResponse>(
      {
        success: false,
        message: failed.map((key) => `${LESSON_MODULE_LABELS[key]}: ${errors[key]}`).join(" "),
        errors: Object.fromEntries(failed.map((key) => [key, [errors[key] as string]])),
      },
      { status: 422 }
    ),
  };
}

function savedMessage(saved: SavedLesson, verb: "saved" | "updated"): string {
  return saved.storedIn === "file"
    ? `Lesson ${verb}.`
    : `Lesson ${verb} to the database. This server can't write lesson files, so students see the change after it is restored into the lesson files and redeployed.`;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const lesson = await readLesson(await resolveRef(params));
    if (!lesson) return fail("Lesson not found", 404);
    return NextResponse.json<AuthResponse<LessonContent>>(
      { success: true, message: "OK", data: lesson },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const ref = await resolveRef(params);

    const body = await readObjectBody(req);
    if (!body) return fail("Invalid JSON body", 422);

    // A full overwrite always leaves a complete modules block behind, so the
    // student side and the editor form never meet a lesson missing one.
    const checked = checkModules(body.modules);
    if ("response" in checked) return checked.response;
    const content = { ...body, modules: checked.modules };

    // Only needed for the audit entry — an unreadable previous version must not block the save.
    const previous = await readLesson(ref).catch(() => null);

    const saved = await saveLesson(ref, content, session.userId);

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "lesson.replace",
      entityType: "CurriculumDocument",
      entityId: lessonPath(ref),
      summary: `Replaced lesson ${ref.lessonId} (${ref.gradeId})`,
      before: previous,
      after: content,
      request: req,
    });

    return NextResponse.json<AuthResponse<SavedLesson>>(
      { success: true, message: savedMessage(saved, "saved"), data: saved },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const ref = await resolveRef(params);

    const existing = await readLesson(ref);
    if (!existing) return fail("Lesson not found", 404);

    const body = await readObjectBody(req);
    if (!body) return fail("Invalid JSON body", 422);

    const merged: LessonContent = { ...existing, ...body };
    if ("modules" in body) {
      const checked = checkModules(body.modules);
      if ("response" in checked) return checked.response;
      merged.modules = checked.modules;
    }

    const saved = await saveLesson(ref, merged, session.userId);

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "lesson.update",
      entityType: "CurriculumDocument",
      entityId: lessonPath(ref),
      summary: `Updated lesson ${ref.lessonId} (${ref.gradeId})`,
      before: existing,
      after: merged,
      request: req,
    });

    return NextResponse.json<AuthResponse<LessonContent>>(
      { success: true, message: savedMessage(saved, "updated"), data: merged },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const ref = await resolveRef(params);

    const removed = await deleteLesson(ref, session.userId);
    if (!removed) return fail("Lesson not found", 404);

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "lesson.delete",
      entityType: "CurriculumDocument",
      entityId: lessonPath(ref),
      summary: `Deleted lesson ${ref.lessonId} (${ref.gradeId})`,
      before: removed,
      request: req,
    });

    return NextResponse.json<AuthResponse>(
      { success: true, message: "Lesson deleted" },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}
