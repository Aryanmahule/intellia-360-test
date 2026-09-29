/**
 * GET   /api/editor/curriculum/[gradeId]  — read curriculum.json
 * PUT   /api/editor/curriculum/[gradeId]  — overwrite curriculum.json
 * PATCH /api/editor/curriculum/[gradeId]  — merge-update curriculum.json
 *
 * `gradeId` arrives from the URL and ends up in a filesystem path, so every
 * handler validates it through assertGradeId before touching the store.
 *
 * Storage goes through readStoreDocument / writeStoreDocument
 * (lib/content/curriculum-store): the file where it is writable, always
 * mirrored into MongoDB because src/data/grades is not covered by any database
 * backup; on a read-only host (Vercel) the mirror alone — where the file write
 * used to fail with an unhandled EROFS 500.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import {
  assertGradeId,
  readStoreDocument,
  storeGradeExists,
  storePath,
  StoreError,
  UnsafePathError,
  writeStoreDocument,
  type StoredDocument,
} from "@/lib/content/curriculum-store";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ gradeId: string }> };

function fail(message: string, status: number) {
  return NextResponse.json<AuthResponse>({ success: false, message }, { status });
}

/** Turns anything thrown while handling the curriculum into a JSON response, never a bare 500. */
function failure(err: unknown) {
  if (err instanceof UnsafePathError) return fail(err.message, 400);
  if (err instanceof StoreError) return fail(err.message, err.status);
  console.error("[editor/curriculum] unexpected error", err);
  return fail("Unexpected server error while handling the curriculum.", 500);
}

async function readObjectBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

function savedMessage(saved: StoredDocument, verb: "saved" | "updated"): string {
  return saved.storedIn === "file"
    ? `curriculum.json ${verb}`
    : `curriculum.json ${verb} to the database. This server can't write curriculum files, so the repository copy updates when it is restored with scripts/restore-curriculum.mjs.`;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const gradeId = assertGradeId((await params).gradeId);
    const data = await readStoreDocument(storePath(gradeId, "curriculum.json"));
    if (data === null) return fail(`curriculum.json not found for ${gradeId}`, 404);

    return NextResponse.json<AuthResponse<unknown>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const gradeId = assertGradeId((await params).gradeId);

    const body = await readObjectBody(request);
    if (!body) return fail("Request body must be a valid JSON object", 422);

    if (!(await storeGradeExists(gradeId))) return fail(`Grade directory not found: ${gradeId}`, 404);

    const relPath = storePath(gradeId, "curriculum.json");
    // Only needed for the audit entry — an unreadable previous version must not block the save.
    const previous = await readStoreDocument(relPath).catch(() => null);

    const saved = await writeStoreDocument(
      { path: relPath, gradeId, kind: "curriculum", content: body, updatedBy: session.userId },
      "curriculum"
    );

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "curriculum.replace",
      entityType: "CurriculumDocument",
      entityId: relPath,
      summary: `Replaced curriculum.json for ${gradeId}`,
      before: previous,
      after: body,
      request,
    });

    return NextResponse.json<AuthResponse<{ version: number | null }>>(
      { success: true, message: savedMessage(saved, "saved"), data: { version: saved.version } },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  try {
    const gradeId = assertGradeId((await params).gradeId);
    const relPath = storePath(gradeId, "curriculum.json");

    const existing = await readStoreDocument(relPath);
    if (!existing || typeof existing !== "object") {
      return fail(`curriculum.json not found for ${gradeId}`, 404);
    }

    const body = await readObjectBody(request);
    if (!body) return fail("Request body must be a valid JSON object", 422);

    const merged = { ...(existing as Record<string, unknown>), ...body };

    const saved = await writeStoreDocument(
      { path: relPath, gradeId, kind: "curriculum", content: merged, updatedBy: session.userId },
      "curriculum"
    );

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "curriculum.update",
      entityType: "CurriculumDocument",
      entityId: relPath,
      summary: `Updated curriculum.json for ${gradeId}`,
      before: existing,
      after: merged,
      request,
    });

    return NextResponse.json<AuthResponse<unknown>>(
      { success: true, message: savedMessage(saved, "updated"), data: merged },
      { status: 200 }
    );
  } catch (err) {
    return failure(err);
  }
}
