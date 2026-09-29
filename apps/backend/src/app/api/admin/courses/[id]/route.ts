/**
 * PATCH  /api/admin/courses/[id]  — ADMIN-only: update a course
 * DELETE /api/admin/courses/[id]  — ADMIN-only: archive a course
 *
 * DELETE archives (sets `archivedAt`) rather than removing the row. Course rows
 * are joined to learner data by `grade`: completed_lessons and student_profiles
 * are counted against it on the dashboard, so a hard delete silently drops a
 * grade out of the completion maths with no way to tell it ever existed.
 * `?permanent=true` still performs a real delete, but only on a course that has
 * already been archived.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { diffFields, recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ id: string }> };

const UpdateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(120).optional(),
  grade: z.string().regex(/^grade\d{1,2}$/).optional(),
  description: z.string().max(2000).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  /** Set to false to bring an archived course back into the catalogue. */
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = UpdateCourseSchema.safeParse(body);
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

  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Course not found" },
      { status: 404 }
    );
  }

  const { archived, ...fields } = result.data;

  const course = await db.course.update({
    where: { id },
    data: {
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });

  const delta = diffFields(
    existing as unknown as Record<string, unknown>,
    course as unknown as Record<string, unknown>
  );

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: archived === false ? "course.restore" : "course.update",
    entityType: "Course",
    entityId: id,
    summary: `Updated course "${course.title}"`,
    before: delta.before,
    after: delta.after,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof course>>(
    { success: true, message: `${course.title} updated.`, data: course },
    { status: 200 }
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Course not found" },
      { status: 404 }
    );
  }

  if (permanent) {
    if (existing.archivedAt === null) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Archive this course before deleting it permanently." },
        { status: 409 }
      );
    }

    await db.course.delete({ where: { id } });

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "course.delete.permanent",
      entityType: "Course",
      entityId: id,
      summary: `Permanently deleted course "${existing.title}"`,
      before: existing,
      request: req,
    });

    return NextResponse.json<AuthResponse>(
      { success: true, message: "Course permanently deleted." },
      { status: 200 }
    );
  }

  if (existing.archivedAt !== null) {
    return NextResponse.json<AuthResponse>(
      { success: true, message: "Course is already archived." },
      { status: 200 }
    );
  }

  await db.course.update({ where: { id }, data: { archivedAt: new Date() } });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "course.archive",
    entityType: "Course",
    entityId: id,
    summary: `Archived course "${existing.title}" (${existing.grade})`,
    before: { archivedAt: null },
    after: { archivedAt: new Date().toISOString() },
    request: req,
  });

  return NextResponse.json<AuthResponse>(
    { success: true, message: "Course archived — it can be restored from the archive." },
    { status: 200 }
  );
}
