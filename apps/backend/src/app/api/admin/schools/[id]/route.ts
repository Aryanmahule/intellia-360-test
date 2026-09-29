/**
 * PATCH  /api/admin/schools/[id]  — ADMIN-only: update a school
 * DELETE /api/admin/schools/[id]  — ADMIN-only: archive a school
 *
 * DELETE archives rather than removes. Teacher and student profiles reference
 * their school by free-text name (`teacher_profiles.schoolName`,
 * `student_profiles.school`), so deleting the row leaves those profiles
 * pointing at a school that no longer exists and silently drops the school out
 * of every roll-up and report. `?permanent=true` performs a real delete, but
 * only once the school has been archived and only when no profile still
 * references it.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { computeSchoolCounts, normSchoolKey } from "@/lib/admin/school-stats";
import { diffFields, recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ id: string }> };

const UpdateSchoolSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  adminName: z.string().max(120).optional(),
  adminEmail: z.string().email().optional(),
  plan: z.enum(["Basic", "Standard", "Premium", "Enterprise"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  /** Set to false to bring an archived school back. */
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = UpdateSchoolSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 }
    );
  }

  const existing = await db.school.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "School not found" },
      { status: 404 }
    );
  }

  const { archived, ...fields } = result.data;

  const school = await db.school.update({
    where: { id },
    data: {
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });

  const delta = diffFields(
    existing as unknown as Record<string, unknown>,
    school as unknown as Record<string, unknown>
  );

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: archived === false ? "school.restore" : "school.update",
    entityType: "School",
    entityId: id,
    summary: `Updated school "${school.name}"`,
    before: delta.before,
    after: delta.after,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof school>>(
    { success: true, message: `${school.name} updated.`, data: school },
    { status: 200 }
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  const existing = await db.school.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "School not found" },
      { status: 404 }
    );
  }

  if (permanent) {
    if (existing.archivedAt === null) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Archive this school before deleting it permanently." },
        { status: 409 }
      );
    }

    // Refuse to orphan profiles that still name this school.
    const counts = await computeSchoolCounts();
    const linked = counts.get(normSchoolKey(existing.name));
    const attached = (linked?.teachers ?? 0) + (linked?.students ?? 0);

    if (attached > 0) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message:
            `${attached} teacher/student profile(s) still reference "${existing.name}". ` +
            "Reassign them before deleting this school permanently.",
        },
        { status: 409 }
      );
    }

    await db.school.delete({ where: { id } });

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "school.delete.permanent",
      entityType: "School",
      entityId: id,
      summary: `Permanently deleted school "${existing.name}" (${existing.code})`,
      before: existing,
      request: req,
    });

    return NextResponse.json<AuthResponse>(
      { success: true, message: "School permanently deleted." },
      { status: 200 }
    );
  }

  if (existing.archivedAt !== null) {
    return NextResponse.json<AuthResponse>(
      { success: true, message: "School is already archived." },
      { status: 200 }
    );
  }

  await db.school.update({ where: { id }, data: { archivedAt: new Date() } });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "school.archive",
    entityType: "School",
    entityId: id,
    summary: `Archived school "${existing.name}" (${existing.code})`,
    before: { archivedAt: null },
    after: { archivedAt: new Date().toISOString() },
    request: req,
  });

  return NextResponse.json<AuthResponse>(
    { success: true, message: "School archived — it can be restored from the archive." },
    { status: 200 }
  );
}
