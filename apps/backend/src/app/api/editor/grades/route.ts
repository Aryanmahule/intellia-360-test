/**
 * GET  /api/editor/grades  — list all grades with metadata
 * POST /api/editor/grades  — create a new grade scaffold
 *
 * Storage goes through lib/content/curriculum-store: grade directories where
 * the store is writable; on a read-only host (Vercel) the database mirror,
 * so grades created or deleted there are listed correctly and creating one no
 * longer fails on the directory write.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import {
  CURRICULUM_ROOT,
  isStoreWritable,
  listMirroredCurricula,
  resolveInStore,
  storeDocumentExists,
  storeGradeExists,
  storePath,
  StoreError,
  UnsafePathError,
  writeStoreDocument,
} from "@/lib/content/curriculum-store";
import { listLessons } from "@/lib/content/lesson-store";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface GradeMeta {
  id: string;
  label: string;
  lessonCount: number;
  hasCurriculum: boolean;
  hasDashboard: boolean;
}

function fail(message: string, status: number) {
  return NextResponse.json<AuthResponse>({ success: false, message }, { status });
}

/** Turns anything thrown while handling grades into a JSON response, never a bare 500. */
function failure(err: unknown) {
  if (err instanceof UnsafePathError) return fail(err.message, 400);
  if (err instanceof StoreError) return fail(err.message, err.status);
  console.error("[editor/grades] unexpected error", err);
  return fail("Unexpected server error while handling grades.", 500);
}

export async function GET() {
  const { errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const ids = new Set<string>(
      fs.existsSync(CURRICULUM_ROOT)
        ? fs
            .readdirSync(CURRICULUM_ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
        : []
    );

    // On a read-only host the mirror knows about grades created or deleted
    // since the build: a live curriculum adds a grade, a tombstone removes it.
    if (!isStoreWritable()) {
      for (const doc of await listMirroredCurricula()) {
        if (doc.deletedAt) ids.delete(doc.gradeId);
        else ids.add(doc.gradeId);
      }
    }

    const grades: GradeMeta[] = await Promise.all(
      [...ids].sort().map(async (id) => ({
        id,
        label: id.replace("grade", "Grade "),
        lessonCount: (await listLessons(id)).length,
        hasCurriculum: await storeDocumentExists(storePath(id, "curriculum.json")),
        hasDashboard: await storeDocumentExists(storePath(id, "dashboard.json")),
      }))
    );

    return NextResponse.json<AuthResponse<GradeMeta[]>>(
      { success: true, message: grades.length ? "OK" : "No grades found", data: grades },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

const EMPTY_CURRICULUM = () => ({
  activeTopic: null,
  standaloneTopics: [],
  chapters: [
    {
      id: "chap_1",
      chapterNumber: 1,
      title: "Chapter 1",
      topicsCount: 0,
      topics: [],
    },
  ],
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => ({}));
  const gradeId: string = String(body.gradeId ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (!gradeId || !/^grade\d+$/.test(gradeId)) {
    return fail("gradeId must match the pattern grade<number> (e.g. grade8)", 422);
  }

  try {
    if (await storeGradeExists(gradeId)) return fail(`${gradeId} already exists`, 409);

    const curriculum = EMPTY_CURRICULUM();

    const saved = await writeStoreDocument(
      {
        path: storePath(gradeId, "curriculum.json"),
        gradeId,
        kind: "curriculum",
        content: curriculum,
        updatedBy: session.userId,
      },
      "grade"
    );

    // The lessons directory only exists where files are written.
    if (saved.storedIn === "file") {
      fs.mkdirSync(resolveInStore(gradeId, "lessons"), { recursive: true });
    }

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "grade.create",
      entityType: "CurriculumGrade",
      entityId: gradeId,
      summary: `Created grade ${gradeId}`,
      after: { gradeId },
      request,
    });

    return NextResponse.json<AuthResponse<{ id: string }>>(
      {
        success: true,
        message: saved.storedIn === "file" ? `${gradeId} created` : `${gradeId} created in the database`,
        data: { id: gradeId },
      },
      { status: 201 }
    );
  } catch (err) {
    return failure(err);
  }
}
