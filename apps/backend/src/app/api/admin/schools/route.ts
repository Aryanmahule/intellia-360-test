/**
 * GET  /api/admin/schools  — ADMIN-only: list schools
 * POST /api/admin/schools  — ADMIN-only: onboard a new school
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { literalSearch, notArchived } from "@/lib/db-filters";
import { computeSchoolCounts, normSchoolKey } from "@/lib/admin/school-stats";
import { recordAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CreateSchoolSchema = z.object({
  name: z.string().min(1, "School name is required"),
  location: z.string().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().email("Enter a valid admin email"),
  plan: z.enum(["Basic", "Standard", "Premium", "Enterprise"]).default("Basic"),
});

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status");
  const includeArchived = searchParams.get("includeArchived") === "true";

  // Filtering and paging happen in the database rather than in the browser,
  // so the payload no longer grows with the number of onboarded schools.
  const where: Prisma.SchoolWhereInput = {
    // notArchived() rather than `archivedAt: null` — see src/lib/db-filters.ts.
    ...(includeArchived ? {} : { AND: [notArchived()] }),
    ...(status === "ACTIVE" || status === "PENDING" || status === "INACTIVE" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: literalSearch(q), mode: "insensitive" } },
            { location: { contains: literalSearch(q), mode: "insensitive" } },
            { code: { contains: literalSearch(q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, schools, counts] = await Promise.all([
    db.school.count({ where }),
    db.school.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    computeSchoolCounts(),
  ]);

  const withLiveCounts = schools.map((s) => {
    const c = counts.get(normSchoolKey(s.name));
    return { ...s, teachersCount: c?.teachers ?? 0, studentsCount: c?.students ?? 0 };
  });

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: withLiveCounts,
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const result = CreateSchoolSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Validation failed", errors: result.error.flatten().fieldErrors as Record<string, string[]> },
      { status: 422 }
    );
  }

  const { name, location, adminName, adminEmail, plan } = result.data;

  // School name is the join key used by computeSchoolCounts() to attribute
  // teachers and students, so two rows with the same name would split one
  // school's roll-up in half. Re-onboarding an existing name is rejected.
  const duplicate = await db.school.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, AND: [notArchived()] },
    select: { id: true, name: true },
  });

  if (duplicate) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: `${duplicate.name} is already onboarded.` },
      { status: 409 }
    );
  }

  const code = `SCH-${Date.now().toString(36).toUpperCase()}`;

  const school = await db.school.create({
    data: { name, location, adminName, adminEmail, plan, code, status: "PENDING" },
  });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "school.create",
    entityType: "School",
    entityId: school.id,
    summary: `Onboarded school "${school.name}" (${school.code})`,
    after: school,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof school>>(
    { success: true, message: `${name} onboarded successfully.`, data: school },
    { status: 201 }
  );
}
