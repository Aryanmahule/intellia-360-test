/**
 * DELETE /api/editor/grades/[gradeId]  — remove a grade
 *
 * This is the most destructive endpoint in the editor module: it recursively
 * deletes a directory whose path is built from a URL segment. `gradeId` is
 * therefore validated (grade<number> only) and the resolved path is asserted to
 * be inside the curriculum store before anything is removed.
 *
 * Every file is mirrored into MongoDB as a tombstone with its content intact,
 * so a grade deleted by mistake can be restored with
 * `node scripts/restore-curriculum.mjs --grade <gradeId>` instead of needing a
 * full database restore.
 *
 * On a read-only host (Vercel) the shipped files cannot be removed, so the
 * tombstones are what delete the grade — there the mirror must succeed.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import {
  assertGradeId,
  classifyPath,
  isReadOnlyError,
  isStoreWritable,
  listGradeFiles,
  listMirroredDocuments,
  markStoreReadOnly,
  mirrorCurriculumDelete,
  mirrorCurriculumWrite,
  readStoreDocument,
  resolveInStore,
  storeGradeExists,
  StoreError,
  UnsafePathError,
} from "@/lib/content/curriculum-store";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

function fail(message: string, status: number) {
  return NextResponse.json<AuthResponse>({ success: false, message }, { status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gradeId: string }> }
) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  let gradeId: string;
  let gradeDir: string;
  try {
    gradeId = assertGradeId((await params).gradeId);
    gradeDir = resolveInStore(gradeId);
  } catch (err) {
    return fail(err instanceof UnsafePathError ? err.message : "Invalid path", 400);
  }

  try {
    if (!(await storeGradeExists(gradeId))) return fail(`${gradeId} not found`, 404);

    // Every file the grade has: the shipped files, plus database-only ones on a
    // read-only host.
    const paths = new Set(listGradeFiles(gradeId));
    if (!isStoreWritable()) {
      for (const doc of await listMirroredDocuments(gradeId)) {
        if (!doc.deletedAt) paths.add(doc.path);
      }
    }
    const files = [...paths];

    // Snapshot every file into the mirror *before* removing it, so the tombstones
    // carry recoverable content rather than just a "this used to exist" marker.
    let snapshotted = true;
    for (const rel of files) {
      try {
        const content = await readStoreDocument(rel);
        if (content === null) continue;
        const { kind, lessonId } = classifyPath(rel);
        const version = await mirrorCurriculumWrite({
          path: rel,
          gradeId,
          kind,
          lessonId,
          content,
          updatedBy: session.userId,
        });
        if (version === null) snapshotted = false;
      } catch (err) {
        console.error("[editor/grades] could not snapshot", rel, err);
      }
    }

    let removedDir = false;
    if (isStoreWritable()) {
      try {
        fs.rmSync(gradeDir, { recursive: true, force: true });
        removedDir = true;
      } catch (err) {
        if (!isReadOnlyError(err)) throw err;
        markStoreReadOnly();
      }
    }

    const tombstoned = await mirrorCurriculumDelete(files, session.userId);

    if (!removedDir && (!snapshotted || !tombstoned)) {
      return fail(
        `${gradeId} was not deleted: this server cannot remove curriculum files and the database could not be reached. Try again in a moment.`,
        503
      );
    }

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "grade.delete",
      entityType: "CurriculumGrade",
      entityId: gradeId,
      summary: `Deleted grade ${gradeId} and ${files.length} file(s)`,
      before: { files },
      request,
    });

    return NextResponse.json<AuthResponse<{ filesRemoved: number }>>(
      {
        success: true,
        message: `${gradeId} deleted — ${files.length} file(s) recoverable from the curriculum mirror`,
        data: { filesRemoved: files.length },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof StoreError) return fail(err.message, err.status);
    console.error("[editor/grades] unexpected error deleting", gradeId, err);
    return fail(`Unexpected server error while deleting ${gradeId}.`, 500);
  }
}
