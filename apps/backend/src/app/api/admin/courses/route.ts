/**
 * GET  /api/admin/courses  — ADMIN-only: list courses (paged, searchable)
 * POST /api/admin/courses  — ADMIN-only: create a course (draft)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { literalSearch, notArchived } from "@/lib/db-filters";
import { countLessonsByGrade } from "@/lib/content/lesson-count";
import { recordAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CreateCourseSchema = z.object({
  title: z.string().min(1, "Course title is required").max(200),
  subject: z.string().max(120).optional(),
  grade: z.string().regex(/^grade\d{1,2}$/, "grade must look like grade1…grade12").default("grade1"),
  description: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const q = searchParams.get("q") ?? "";
  const grade = searchParams.get("grade") ?? undefined;
  const status = searchParams.get("status");
  const includeArchived = searchParams.get("includeArchived") === "true";

  // Search/filter/pagination happen in the database. The previous version
  // returned every course row on every request and left filtering to the
  // client, which grows linearly with the catalogue.
  const where: Prisma.CourseWhereInput = {
    // notArchived() rather than `archivedAt: null` — see src/lib/db-filters.ts.
    ...(includeArchived ? {} : { AND: [notArchived()] }),
    ...(grade ? { grade } : {}),
    ...(status === "PUBLISHED" || status === "DRAFT" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: literalSearch(q), mode: "insensitive" } },
            { subject: { contains: literalSearch(q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, courses, studentGrades] = await Promise.all([
    db.course.count({ where }),
    db.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    // One grouped query for enrolment across all grades, rather than a count
    // per course row (which would be an N+1 over the catalogue).
    db.studentProfile.groupBy({ by: ["grade"], _count: { _all: true } }),
  ]);

  const enrolledByGrade = new Map(studentGrades.map((g) => [g.grade, g._count._all]));
  const lessonsByGrade = countLessonsByGrade();

  const withLiveCounts = courses.map((c) => ({
    ...c,
    lessonsCount: lessonsByGrade[c.grade] ?? 0,
    enrolledStudents: enrolledByGrade.get(c.grade) ?? 0,
  }));

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
  const result = CreateCourseSchema.safeParse(body);
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

  // A course is identified by title within a grade. Without this check a
  // double-submitted form silently creates two catalogue entries that then
  // split the same enrolment and completion numbers between them.
  const duplicate = await db.course.findFirst({
    where: {
      grade: result.data.grade,
      title: { equals: result.data.title, mode: "insensitive" },
      AND: [notArchived()],
    },
    select: { id: true, title: true },
  });

  if (duplicate) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: `A course titled "${duplicate.title}" already exists for ${result.data.grade}.`,
      },
      { status: 409 }
    );
  }

  const course = await db.course.create({
    data: { ...result.data, status: "DRAFT" },
  });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "course.create",
    entityType: "Course",
    entityId: course.id,
    summary: `Created course "${course.title}" (${course.grade})`,
    after: course,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof course>>(
    { success: true, message: `${course.title} created as a draft.`, data: course },
    { status: 201 }
  );
}
