/**
 * GET /api/admin/stats  — ADMIN-only: platform aggregate stats.
 * Shared by the Admin Dashboard, Analytics and Profile pages so the same
 * counts aren't queried/computed more than once across the module.
 */
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { countGradesAndLessons } from "@/lib/content/lesson-count";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface AdminStats {
  totalUsers: number;
  schools: number;
  teachers: number;
  students: number;
  courses: number;
  totalGrades: number;
  totalLessons: number;
  assessmentsTaken: number;
  quizAccuracyPercent: number;
  revenueMTD: number;
  dbPingMs: number;
}

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const dbStart = Date.now();
  const [
    totalUsers,
    schools,
    teachers,
    students,
    courses,
    quizAttempts,
    revenueAgg,
  ] = await Promise.all([
    db.user.count(),
    db.school.count(),
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.course.count(),
    db.quizAttempt.findMany({ select: { scorePercent: true } }),
    db.payment.aggregate({
      where: { status: "COMPLETED", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);
  const dbPingMs = Date.now() - dbStart;

  const { totalGrades, totalLessons } = countGradesAndLessons();

  const quizAccuracyPercent =
    quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / quizAttempts.length
        )
      : 0;

  const stats: AdminStats = {
    totalUsers,
    schools,
    teachers,
    students,
    courses,
    totalGrades,
    totalLessons,
    assessmentsTaken: quizAttempts.length,
    quizAccuracyPercent,
    revenueMTD: revenueAgg._sum.amount ?? 0,
    dbPingMs,
  };

  return NextResponse.json<AuthResponse<AdminStats>>(
    { success: true, message: "OK", data: stats },
    { status: 200 }
  );
}
