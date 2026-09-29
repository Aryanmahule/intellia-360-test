/**
 * PATCH  /api/admin/content/[id]  — ADMIN-only: update or restore a resource
 * DELETE /api/admin/content/[id]  — ADMIN-only: archive a content resource
 *
 * DELETE archives rather than removes so a resource pulled from the library by
 * mistake can be put back, and so the audit trail has a row to point at.
 * `?permanent=true` deletes for real, but only once archived.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { diffFields, recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ id: string }> };

const UpdateContentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(["edunotes", "visual-models", "videos", "ai-prompts"]).optional(),
  url: z.string().url().optional().or(z.literal("")),
  /** Set to false to restore an archived resource. */
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = UpdateContentSchema.safeParse(body);
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

  const existing = await db.contentResource.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Resource not found" },
      { status: 404 }
    );
  }

  const { archived, ...fields } = result.data;

  const item = await db.contentResource.update({
    where: { id },
    data: {
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
    },
  });

  const delta = diffFields(
    existing as unknown as Record<string, unknown>,
    item as unknown as Record<string, unknown>
  );

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: archived === false ? "content.restore" : "content.update",
    entityType: "ContentResource",
    entityId: id,
    summary: `Updated content resource "${item.title}"`,
    before: delta.before,
    after: delta.after,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof item>>(
    { success: true, message: "Resource updated.", data: item },
    { status: 200 }
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  const existing = await db.contentResource.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Resource not found" },
      { status: 404 }
    );
  }

  if (permanent) {
    if (existing.archivedAt === null) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "Archive this resource before deleting it permanently." },
        { status: 409 }
      );
    }

    await db.contentResource.delete({ where: { id } });

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "content.delete.permanent",
      entityType: "ContentResource",
      entityId: id,
      summary: `Permanently deleted content resource "${existing.title}"`,
      before: existing,
      request: req,
    });

    return NextResponse.json<AuthResponse>(
      { success: true, message: "Resource permanently deleted." },
      { status: 200 }
    );
  }

  if (existing.archivedAt !== null) {
    return NextResponse.json<AuthResponse>(
      { success: true, message: "Resource is already archived." },
      { status: 200 }
    );
  }

  await db.contentResource.update({ where: { id }, data: { archivedAt: new Date() } });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "content.archive",
    entityType: "ContentResource",
    entityId: id,
    summary: `Archived content resource "${existing.title}" (${existing.category})`,
    before: { archivedAt: null },
    after: { archivedAt: new Date().toISOString() },
    request: req,
  });

  return NextResponse.json<AuthResponse>(
    { success: true, message: "Resource archived — it can be restored from the archive." },
    { status: 200 }
  );
}
