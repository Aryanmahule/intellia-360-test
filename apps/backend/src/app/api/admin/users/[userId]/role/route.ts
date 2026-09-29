/**
 * PATCH /api/admin/users/[userId]/role
 *
 * ADMIN-only: change a user's role.
 *
 * Rules enforced server-side:
 *   1. Only ADMIN can call this endpoint.
 *   2. An admin cannot remove their own ADMIN role (prevents lockout).
 *   3. When a role changes, the appropriate profile is created/preserved.
 *   4. requestedRole is cleared after the admin acts on it.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { ALL_ROLES } from "@intellia360/shared/auth/roles";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type { AuthResponse, UserRole } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ userId: string }> };

const RoleChangeSchema = z.object({
  role: z.enum(ALL_ROLES),
  reason: z.string().max(500).optional(), // optional audit note
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { errorResponse, session } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { userId } = await params;

  // Parse body once — req.json() can only be read once (it's a stream)
  const body   = await req.json().catch(() => ({}));
  const result = RoleChangeSchema.safeParse(body);

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

  const { role } = result.data;

  // ── Guard: admin cannot demote themselves ──────────────────────────────────
  if (session.userId === userId && role !== "ADMIN") {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "You cannot remove your own ADMIN role. Ask another admin." },
      { status: 400 }
    );
  }

  // ── Fetch the target user ──────────────────────────────────────────────────
  const target = await db.user.findUnique({
    where:   { id: userId },
    include: { studentProfile: true, teacherProfile: true },
  });

  if (!target) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  // ── Apply role change + create missing profile in one transaction ──────────
  const updated = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data:  {
        role:          role as UserRole,
        requestedRole: null, // clear pending upgrade flag
      },
      select: { id: true, name: true, email: true, role: true, requestedRole: true },
    });

    // Ensure the correct profile exists for the new role
    if ((role === "TEACHER" || role === "SCHOOL") && !target.teacherProfile) {
      await tx.teacherProfile.create({ data: { userId } });
    }

    if ((role === "STUDENT" || role === "PARENT") && !target.studentProfile) {
      await tx.studentProfile.create({
        data: {
          userId,
          grade:         "grade1",
          xpPoints:      0,
          learningGems:  0,
          streakDays:    1,
          lastActiveDate: new Date(),
        },
      });
    }

    return u;
  });

  // A role change is the single highest-privilege mutation in the platform —
  // it is what turns an ordinary account into an ADMIN or EDITOR.
  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "user.role.change",
    entityType: "User",
    entityId: userId,
    summary: `Changed role of ${target.email} from ${target.role} to ${role}`,
    before: { role: target.role, requestedRole: target.requestedRole },
    after:  { role: updated.role, requestedRole: updated.requestedRole },
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof updated>>(
    {
      success: true,
      message: `Role updated to ${role} for ${updated.name}`,
      data:    updated,
    },
    { status: 200 }
  );
}
