/**
 * GET  /api/admin/users
 * POST /api/admin/users
 *
 * ADMIN-only: list users with pagination, search, and role filter, and create
 * accounts directly with any role. Account management lives here and not in
 * the editor console — no other role can list or create users.
 *
 * GET returns requestedRole alongside current role so admins can action
 * pending role upgrade requests.
 *
 * Deactivated accounts (`deletedAt` set) are excluded unless the caller asks
 * for them explicitly with `?includeDeleted=true`, which is how an admin finds
 * an account to restore.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { hashPassword } from "@/lib/auth/hash";
import { PasswordSchema } from "@/lib/auth/validation";
import { ALL_ROLES } from "@intellia360/shared/auth/roles";
import { requireEmailVerification } from "@/lib/auth/verification-policy";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notDeleted, hasRequestedRole, literalSearch } from "@/lib/db-filters";
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface AdminUserRow {
  id:            string;
  name:          string;
  email:         string;
  role:          string;
  requestedRole: string | null;
  emailVerified: boolean;
  createdAt:     string;
  /** True when requestedRole differs from current role — needs admin review. */
  pendingUpgrade: boolean;
  /** ISO timestamp when the account was deactivated, null when active. */
  deletedAt:     string | null;
  // Role-scoped profile fields (present when the row's role matches)
  grade?:        string;
  school?:       string | null;
  subject?:      string | null;
  xpPoints?:     number;
  learningGems?: number;
  lastActiveDate?: string | null;
  classesCount?: number;
}

/** Only the fields the table renders — never the password hash. */
const ROW_SELECT = {
  id:            true,
  name:          true,
  email:         true,
  role:          true,
  requestedRole: true,
  emailVerified: true,
  createdAt:     true,
  deletedAt:     true,
  studentProfile: {
    select: { grade: true, school: true, xpPoints: true, learningGems: true, lastActiveDate: true },
  },
  teacherProfile: {
    select: { schoolName: true, subject: true, _count: { select: { classes: true } } },
  },
} satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(u: UserRecord): AdminUserRow {
  return {
    id:            u.id,
    name:          u.name,
    email:         u.email,
    role:          u.role,
    requestedRole: u.requestedRole,
    emailVerified: u.emailVerified,
    createdAt:     u.createdAt.toISOString(),
    pendingUpgrade: u.requestedRole !== null && u.requestedRole !== u.role,
    deletedAt:     u.deletedAt?.toISOString() ?? null,
    grade:          u.studentProfile?.grade,
    school:         u.studentProfile?.school ?? u.teacherProfile?.schoolName ?? null,
    subject:        u.teacherProfile?.subject ?? null,
    xpPoints:       u.studentProfile?.xpPoints,
    learningGems:   u.studentProfile?.learningGems,
    lastActiveDate: u.studentProfile?.lastActiveDate?.toISOString() ?? null,
    classesCount:   u.teacherProfile?._count.classes,
  };
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const roleParam = searchParams.get("role");
  // Only a real Role member reaches the query — an unknown value would otherwise
  // be cast straight into the filter and match nothing silently.
  const role = roleParam && roleParam in Role ? (roleParam as Role) : undefined;
  const q      = searchParams.get("q")      ?? "";
  const pending = searchParams.get("pending") === "true";
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const where: Prisma.UserWhereInput = {
    // `notDeleted()` rather than `deletedAt: null` — see src/lib/db-filters.ts:
    // documents that never had the key written are not matched by a null filter,
    // which made this endpoint return an empty list for every real account.
    ...(includeDeleted ? {} : { AND: [notDeleted()] }),
    ...(role ? { role } : {}),
    ...(q ? {
      OR: [
        { name:  { contains: literalSearch(q), mode: "insensitive" } },
        { email: { contains: literalSearch(q), mode: "insensitive" } },
      ],
    } : {}),
  };

  // "Pending upgrade" compares two fields on the same document, which MongoDB
  // cannot express in a plain filter. The previous version paginated first and
  // filtered in JS afterwards, so ?pending=true returned only the pending users
  // that happened to fall on the requested page and reported a `total` for the
  // unfiltered set. Narrow in the database to rows that have a requestedRole at
  // all — a small subset — then compare and paginate over the true result set.
  if (pending) {
    const candidates = await db.user.findMany({
      where: { ...where, ...hasRequestedRole() },
      select: ROW_SELECT,
      orderBy: { createdAt: "desc" },
    });

    const matched = candidates.filter((u) => u.requestedRole !== u.role);
    const paged = matched.slice((page - 1) * limit, page * limit);

    return NextResponse.json(
      {
        success: true,
        message: "OK",
        data: paged.map(toRow),
        meta: {
          total: matched.length,
          page,
          limit,
          pages: Math.max(1, Math.ceil(matched.length / limit)),
        },
      },
      { status: 200 }
    );
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: ROW_SELECT,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data:    users.map(toRow),
      meta:    { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    { status: 200 }
  );
}

// ── POST (create) ─────────────────────────────────────────────────────────────
// Accounts created here go through the same rules as self-registration, so an
// admin-created account cannot end up with a weaker password or a
// non-normalised email that its owner can then never log in with.
const CreateUserSchema = z.object({
  name:     z.string().trim().min(2, "Name must be at least 2 characters"),
  email:    z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: PasswordSchema,
  role:     z.enum(ALL_ROLES),
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body   = await request.json().catch(() => ({}));
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        // The first rule that failed, so the form can show something actionable.
        message: result.error.issues[0]?.message ?? "Validation failed",
        errors:  result.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 }
    );
  }

  const { name, email, password, role } = result.data;

  const existing = await db.user.findUnique({ where: { email }, select: { deletedAt: true } });
  if (existing) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: existing.deletedAt
          ? "A deactivated account already uses this email — restore it instead."
          : "An account with this email already exists.",
      },
      { status: 409 }
    );
  }

  const hashed = await hashPassword(password);

  const created = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name,
        email,
        password:      hashed,
        role:          role as Role,
        emailVerified: !requireEmailVerification(),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Same profile rules as a role change — every page for the role reads it.
    if (role === "TEACHER" || role === "SCHOOL") {
      await tx.teacherProfile.create({ data: { userId: u.id } });
    }

    if (role === "STUDENT" || role === "PARENT") {
      await tx.studentProfile.create({
        data: {
          userId:         u.id,
          grade:          "grade1",
          xpPoints:       0,
          learningGems:   0,
          streakDays:     1,
          lastActiveDate: new Date(),
        },
      });
    }

    return u;
  });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "user.create",
    entityType: "User",
    entityId: created.id,
    summary: `Created ${created.email} as ${created.role}`,
    after: { role: created.role },
    request,
  });

  return NextResponse.json<AuthResponse<typeof created>>(
    { success: true, message: `Created ${created.name} as ${created.role}`, data: created },
    { status: 201 }
  );
}
