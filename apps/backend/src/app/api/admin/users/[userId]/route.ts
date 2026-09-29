/**
 * GET    /api/admin/users/[userId]   — fetch a single user (ADMIN only)
 * PATCH  /api/admin/users/[userId]   — update name, or restore a deactivated
 *                                      account (role changes go to /role)
 * DELETE /api/admin/users/[userId]   — deactivate a user (ADMIN only; not self)
 *
 * Deletion policy
 * ───────────────
 * DELETE performs a *soft* delete: it stamps `deletedAt` and leaves the row in
 * place. A hard delete cascades through completed_lessons, completed_activities,
 * quiz_attempts, unlocked_badges, mission_progress, daily_quiz_attempts and
 * notifications — a learner's entire history, unrecoverable, with a single
 * click and no audit trail.
 *
 * Permanent deletion is still available for genuine erasure requests, but only
 * as a second, explicit step (`?permanent=true` on an already-deactivated
 * account), and the audit entry records how much history it destroyed.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ userId: string }> };

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { userId } = await params;

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: {
      id:            true,
      name:          true,
      email:         true,
      role:          true,
      requestedRole: true,
      emailVerified: true,
      createdAt:     true,
      updatedAt:     true,
      deletedAt:     true,
    },
  });

  if (!user) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: {
        ...user,
        createdAt:      user.createdAt.toISOString(),
        updatedAt:      user.updatedAt.toISOString(),
        deletedAt:      user.deletedAt?.toISOString() ?? null,
        pendingUpgrade: user.requestedRole !== null && user.requestedRole !== user.role,
      },
    },
    { status: 200 }
  );
}

// ── PATCH (name, or restore) ──────────────────────────────────────────────────
const PatchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  /** Clears `deletedAt`, bringing a deactivated account back with its history. */
  restore: z.boolean().optional(),
}).refine((v) => v.name !== undefined || v.restore !== undefined, {
  message: "Provide a name to update or restore: true",
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { userId } = await params;
  const body   = await req.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "Validation failed",
        errors:  result.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 }
    );
  }

  const existing = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  const updated = await db.user.update({
    where:  { id: userId },
    data:   {
      ...(result.data.name !== undefined ? { name: result.data.name } : {}),
      ...(result.data.restore ? { deletedAt: null } : {}),
    },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: result.data.restore ? "user.restore" : "user.update",
    entityType: "User",
    entityId: userId,
    summary: result.data.restore
      ? `Restored deactivated account ${existing.email}`
      : `Renamed ${existing.email} to "${updated.name}"`,
    before: { name: existing.name, deletedAt: existing.deletedAt },
    after:  { name: updated.name,  deletedAt: updated.deletedAt },
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof updated>>(
    {
      success: true,
      message: result.data.restore ? "User restored" : "User updated",
      data: updated,
    },
    { status: 200 }
  );
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const { errorResponse, session } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { userId } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (session.userId === userId) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  if (!target) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  /* ── Permanent erasure — deliberately a second step ────────────────────── */
  if (permanent) {
    if (target.deletedAt === null) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message:
            "Deactivate this account first. Permanent deletion destroys all " +
            "progress, quiz and badge history and cannot be undone.",
        },
        { status: 409 }
      );
    }

    // Count what is about to be destroyed so the audit entry records the scale
    // of the loss even though the rows themselves are gone.
    const [lessons, activities, quizzes, badges, dailyQuizzes] = await Promise.all([
      db.completedLesson.count({ where: { userId } }),
      db.completedActivity.count({ where: { userId } }),
      db.quizAttempt.count({ where: { userId } }),
      db.unlockedBadge.count({ where: { userId } }),
      db.dailyQuizAttempt.count({ where: { userId } }),
    ]);

    await db.user.delete({ where: { id: userId } });

    await recordAudit({
      actor: { userId: session.userId, email: session.email, role: session.role },
      action: "user.delete.permanent",
      entityType: "User",
      entityId: userId,
      summary: `Permanently deleted ${target.email} (${target.role})`,
      before: {
        user: target,
        destroyedHistory: { lessons, activities, quizzes, badges, dailyQuizzes },
      },
      request: req,
    });

    return NextResponse.json<AuthResponse>(
      { success: true, message: "User permanently deleted" },
      { status: 200 }
    );
  }

  /* ── Soft delete (default) ────────────────────────────────────────────── */
  if (target.deletedAt !== null) {
    return NextResponse.json<AuthResponse>(
      { success: true, message: "User is already deactivated" },
      { status: 200 }
    );
  }

  await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "user.deactivate",
    entityType: "User",
    entityId: userId,
    summary: `Deactivated ${target.email} (${target.role})`,
    before: { deletedAt: null },
    after:  { deletedAt: new Date().toISOString() },
    request: req,
  });

  return NextResponse.json<AuthResponse>(
    {
      success: true,
      message: "User deactivated — their history is retained and the account can be restored.",
    },
    { status: 200 }
  );
}
