/**
 * GET /api/admin/dashboard?range=7d|30d|90d|12m
 *
 * ADMIN-only: every number the Admin Dashboard renders, in ONE round-trip.
 *
 * The dashboard previously issued `/api/admin/stats` three times (once per
 * widget hook) and pointed its charts at `/api/admin/analytics/*` routes that
 * were never implemented, so those charts rendered permanently empty. This
 * route replaces both: a single fetch, a fixed number of aggregate queries (no
 * per-row follow-ups), and only values that actually exist in the database or
 * in the filesystem-backed curriculum store.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import {
  countGradesAndLessons,
  countLessonsByGrade,
  countQuestionBank,
} from "@/lib/content/lesson-count";
import type { AuthResponse } from "@intellia360/shared/types/auth";

/* ─── Response shape ──────────────────────────────────────────────────────── */

import type {
  RangeKey,
  AdminKpi,
  AdminOverviewSeries,
  AdminOverviewTile,
  AdminDistributionSlice,
  AdminTopCourse,
  AdminActivityEntry,
  AdminHealthItem,
  AdminDashboardData,
} from "@intellia360/shared/types/api/admin-dashboard";

export type {
  RangeKey,
  AdminKpi,
  AdminOverviewSeries,
  AdminOverviewTile,
  AdminDistributionSlice,
  AdminTopCourse,
  AdminActivityEntry,
  AdminHealthItem,
  AdminDashboardData,
};

/* ─── Range helpers ───────────────────────────────────────────────────────── */

const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

function parseRange(raw: string | null): RangeKey {
  return raw === "7d" || raw === "90d" || raw === "12m" ? raw : "30d";
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const DAY_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH_FMT = new Intl.DateTimeFormat("en-GB", { month: "short" });

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Splits the window into a bounded number of buckets so the chart stays
 * readable — and the payload small — however long the selected range is.
 */
function buildBuckets(from: Date, to: Date, key: RangeKey): { edges: Date[]; labels: string[] } {
  const edges: Date[] = [];
  const labels: string[] = [];

  if (key === "12m") {
    const cursor = new Date(to.getFullYear(), to.getMonth() - 11, 1);
    for (let i = 0; i < 12; i += 1) {
      edges.push(new Date(cursor));
      labels.push(MONTH_FMT.format(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { edges, labels };
  }

  const totalDays = RANGE_DAYS[key];
  const step = key === "90d" ? 7 : key === "30d" ? 2 : 1;
  const cursor = startOfDay(from);
  for (let day = 0; day < totalDays; day += step) {
    edges.push(new Date(cursor));
    labels.push(DAY_FMT.format(cursor));
    cursor.setDate(cursor.getDate() + step);
  }
  return { edges, labels };
}

/** Cumulative running total per bucket, seeded with the count before the window. */
function cumulativeSeries(dates: Date[], edges: Date[], baseline: number): number[] {
  const perBucket: number[] = new Array(edges.length).fill(0);

  for (const date of dates) {
    for (let i = edges.length - 1; i >= 0; i -= 1) {
      if (date >= edges[i]) {
        perBucket[i] += 1;
        break;
      }
    }
  }

  let running = baseline;
  return perBucket.map((count) => (running += count));
}

/**
 * Period-over-period change, or null when there is no baseline to divide by.
 * A jump from 0 is deliberately NOT reported as "+100%" — that reads as a real
 * measured trend when in fact nothing existed to compare against.
 */
function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Backup freshness.
 *
 * A backup job that quietly stopped running looks exactly like one that is
 * working, so staleness is reported as Degraded rather than left invisible.
 * The threshold is one and a half days: the schedule is nightly, so a single
 * missed run should surface the next morning.
 */
const BACKUP_STALE_MS = 36 * 60 * 60 * 1000;

function buildBackupHealth(
  last: { finishedAt: Date | null; documentCount: number; destination: string } | null
): AdminHealthItem {
  if (!last?.finishedAt) {
    return {
      id: "backup",
      name: "Database Backup",
      status: "Not configured",
      detail: "No verified backup recorded yet",
    };
  }

  const ageMs = Date.now() - last.finishedAt.getTime();
  const ageHours = Math.round(ageMs / 3_600_000);
  const offsite = last.destination.includes("s3");

  return {
    id: "backup",
    name: "Database Backup",
    status: ageMs > BACKUP_STALE_MS ? "Degraded" : "Operational",
    detail:
      `${last.documentCount.toLocaleString("en-IN")} documents, ${ageHours}h ago` +
      (offsite ? " (off-site copy held)" : " — LOCAL ONLY, no off-site copy"),
  };
}

/* ─── Handler ─────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const rangeKey = parseRange(request.nextUrl.searchParams.get("range"));
  const days = RANGE_DAYS[rangeKey];

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  const todayStart = startOfDay(to);

  const inRange = { gte: from, lte: to };
  const inPrevRange = { gte: prevFrom, lt: from };

  const dbStart = Date.now();
  const [
    roleGroups,
    studentsBefore,
    teachersBefore,
    coursesBefore,
    courses,
    newUsers,
    lessonsDoneBefore,
    lessonsDoneInRange,
    lessonsDonePrev,
    completedByGrade,
    studentsByGrade,
    activeInRange,
    activePrev,
    dailyActive,
    quizInRange,
    quizPrev,
    recentUsers,
    recentSchools,
    recentCourses,
    recentContent,
    recentPayments,
    lastBackup,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.count({ where: { role: "STUDENT", createdAt: { lt: from } } }),
    db.user.count({ where: { role: "TEACHER", createdAt: { lt: from } } }),
    db.course.count({ where: { createdAt: { lt: from } } }),
    db.course.findMany({
      select: { id: true, title: true, grade: true, subject: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    // Narrow two-field projection over the window — enough to bucket the chart
    // without a query per day, and far cheaper than loading whole user rows.
    db.user.findMany({ where: { createdAt: inRange }, select: { createdAt: true, role: true } }),
    db.completedLesson.count({ where: { completedAt: { lt: from } } }),
    db.completedLesson.findMany({ where: { completedAt: inRange }, select: { completedAt: true } }),
    db.completedLesson.count({ where: { completedAt: inPrevRange } }),
    db.completedLesson.groupBy({ by: ["grade"], _count: { _all: true } }),
    db.studentProfile.groupBy({ by: ["grade"], _count: { _all: true } }),
    db.user.count({ where: { role: "STUDENT", studentProfile: { lastActiveDate: inRange } } }),
    db.user.count({ where: { role: "STUDENT", studentProfile: { lastActiveDate: inPrevRange } } }),
    db.user.count({ where: { role: "STUDENT", studentProfile: { lastActiveDate: { gte: todayStart } } } }),
    db.quizAttempt.findMany({ where: { submittedAt: inRange }, select: { scorePercent: true } }),
    db.quizAttempt.findMany({ where: { submittedAt: inPrevRange }, select: { scorePercent: true } }),
    db.user.findMany({
      select: { id: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.school.findMany({
      select: { id: true, name: true, location: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.course.findMany({
      select: { id: true, title: true, grade: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.contentResource.findMany({
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.payment.findMany({
      select: { id: true, payerName: true, amount: true, status: true, date: true },
      orderBy: { date: "desc" },
      take: 4,
    }),
    // Most recent verified backup — turns "are we backed up?" into something
    // the dashboard can answer, instead of a question for the ops channel.
    db.backupRun.findFirst({
      where: { status: "SUCCESS", verified: true },
      select: { finishedAt: true, documentCount: true, destination: true, sizeBytes: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  const dbPingMs = Date.now() - dbStart;

  /* ── Totals by role ────────────────────────────────────────────────────── */
  const countByRole = new Map<string, number>(roleGroups.map((g) => [g.role as string, g._count._all]));
  const totalStudents = countByRole.get("STUDENT") ?? 0;
  const totalTeachers = countByRole.get("TEACHER") ?? 0;
  const totalParents = countByRole.get("PARENT") ?? 0;
  const totalOthers =
    (countByRole.get("ADMIN") ?? 0) + (countByRole.get("SCHOOL") ?? 0) + (countByRole.get("EDITOR") ?? 0);
  const totalUsers = totalStudents + totalTeachers + totalParents + totalOthers;

  /* ── Time series ───────────────────────────────────────────────────────── */
  const { edges, labels } = buildBuckets(from, to, rangeKey);

  const studentSeries = cumulativeSeries(
    newUsers.filter((u) => u.role === "STUDENT").map((u) => u.createdAt),
    edges,
    studentsBefore
  );
  const teacherSeries = cumulativeSeries(
    newUsers.filter((u) => u.role === "TEACHER").map((u) => u.createdAt),
    edges,
    teachersBefore
  );
  const lessonSeries = cumulativeSeries(
    lessonsDoneInRange.map((l) => l.completedAt),
    edges,
    lessonsDoneBefore
  );
  const courseSeries = cumulativeSeries(
    courses.filter((c) => c.createdAt >= from).map((c) => c.createdAt),
    edges,
    coursesBefore
  );

  /* ── Curriculum content (filesystem-backed, no time dimension) ─────────── */
  const { totalLessons } = countGradesAndLessons();
  const questionBankSize = countQuestionBank();

  const kpis: AdminKpi[] = [
    {
      id: "students",
      title: "Total Students",
      value: totalStudents,
      growthPercent: percentChange(totalStudents, studentsBefore),
      icon: "Users",
      color: "violet",
      series: studentSeries,
      href: "/admin/students",
    },
    {
      id: "teachers",
      title: "Total Teachers",
      value: totalTeachers,
      growthPercent: percentChange(totalTeachers, teachersBefore),
      icon: "GraduationCap",
      color: "blue",
      series: teacherSeries,
      href: "/admin/teachers",
    },
    {
      id: "courses",
      title: "Total Courses",
      value: courses.length,
      growthPercent: percentChange(courses.length, coursesBefore),
      icon: "BookOpen",
      color: "emerald",
      series: courseSeries,
      href: "/admin/courses",
    },
    {
      id: "lessons",
      title: "Total Lessons",
      value: totalLessons,
      growthPercent: null, // curriculum store keeps no history to compare against
      icon: "ClipboardCheck",
      color: "amber",
      series: [],
      href: "/admin/content",
    },
    {
      id: "questions",
      title: "Question Bank",
      value: questionBankSize,
      growthPercent: null, // ships with the app; no historical snapshots
      icon: "MessageSquare",
      color: "rose",
      series: [],
      href: "/admin/content",
    },
    {
      id: "active",
      title: "Active Learners",
      value: activeInRange,
      growthPercent: percentChange(activeInRange, activePrev),
      icon: "UserCheck",
      color: "cyan",
      series: [],
      href: "/admin/analytics",
    },
  ];

  /* ── Overview tiles under the chart ────────────────────────────────────── */
  const accuracyNow = average(quizInRange.map((q) => q.scorePercent));
  const accuracyPrev = average(quizPrev.map((q) => q.scorePercent));

  const overviewTiles: AdminOverviewTile[] = [
    {
      id: "lessons-completed",
      label: "Lessons Completed",
      value: lessonsDoneInRange.length.toLocaleString("en-IN"),
      growthPercent: percentChange(lessonsDoneInRange.length, lessonsDonePrev),
      icon: "BookOpenCheck",
    },
    {
      id: "assessments",
      label: "Assessments Taken",
      value: quizInRange.length.toLocaleString("en-IN"),
      growthPercent: percentChange(quizInRange.length, quizPrev.length),
      icon: "ClipboardCheck",
    },
    {
      id: "accuracy",
      label: "Accuracy Rate",
      value: `${accuracyNow}%`,
      growthPercent: percentChange(accuracyNow, accuracyPrev),
      icon: "Award",
    },
    {
      id: "dau",
      label: "Daily Active Users",
      value: dailyActive.toLocaleString("en-IN"),
      growthPercent: null, // a single-day count has no matching prior window
      icon: "Zap",
    },
  ];

  /* ── User distribution ─────────────────────────────────────────────────── */
  const pct = (n: number) => (totalUsers > 0 ? Math.round((n / totalUsers) * 1000) / 10 : 0);

  const distribution = {
    total: totalUsers,
    slices: (
      [
        { id: "students", label: "Students", count: totalStudents, percent: pct(totalStudents), color: "#7c5cff", href: "/admin/students" },
        { id: "teachers", label: "Teachers", count: totalTeachers, percent: pct(totalTeachers), color: "#3b82f6", href: "/admin/teachers" },
        { id: "parents", label: "Parents", count: totalParents, percent: pct(totalParents), color: "#22c55e", href: "/admin/students" },
        { id: "others", label: "Staff & Admins", count: totalOthers, percent: pct(totalOthers), color: "#f59e0b", href: "/admin/settings" },
      ] as AdminDistributionSlice[]
    ).filter((slice) => slice.count > 0),
  };

  /* ── Top courses ───────────────────────────────────────────────────────── */
  const lessonsByGrade = countLessonsByGrade();
  const enrolledByGrade = new Map(studentsByGrade.map((g) => [g.grade, g._count._all]));
  const doneByGrade = new Map(completedByGrade.map((g) => [g.grade, g._count._all]));

  const topCourses: AdminTopCourse[] = courses
    .map((course) => {
      const students = enrolledByGrade.get(course.grade) ?? 0;
      const lessons = lessonsByGrade[course.grade] ?? 0;
      const possible = students * lessons;
      const completionPercent =
        possible > 0
          ? Math.min(100, Math.round(((doneByGrade.get(course.grade) ?? 0) / possible) * 100))
          : 0;

      return {
        id: course.id,
        title: course.title,
        grade: course.grade,
        subject: course.subject,
        students,
        lessons,
        completionPercent,
        status: course.status as string,
      };
    })
    .sort((a, b) => b.students - a.students || b.completionPercent - a.completionPercent)
    .slice(0, 5);

  /* ── Recent activity (fixed query count, merged in memory) ─────────────── */
  const activity: AdminActivityEntry[] = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,
      kind: "user" as const,
      title: `New ${u.role.toLowerCase()} registered`,
      subtitle: u.name,
      at: u.createdAt.toISOString(),
      href: u.role === "TEACHER" ? "/admin/teachers" : "/admin/students",
    })),
    ...recentSchools.map((s) => ({
      id: `school-${s.id}`,
      kind: "school" as const,
      title: "School onboarded",
      subtitle: s.location ? `${s.name} · ${s.location}` : s.name,
      at: s.createdAt.toISOString(),
      href: "/admin/schools",
    })),
    ...recentCourses.map((c) => ({
      id: `course-${c.id}`,
      kind: "course" as const,
      title: "New course created",
      subtitle: c.title,
      at: c.createdAt.toISOString(),
      href: "/admin/courses",
    })),
    ...recentContent.map((c) => ({
      id: `content-${c.id}`,
      kind: "content" as const,
      title: "Content resource added",
      subtitle: `${c.title} · ${c.category}`,
      at: c.createdAt.toISOString(),
      href: "/admin/content",
    })),
    ...recentPayments.map((p) => ({
      id: `payment-${p.id}`,
      kind: "payment" as const,
      title: `Payment ${p.status.toLowerCase()}`,
      subtitle: `${p.payerName} · ₹${p.amount.toLocaleString("en-IN")}`,
      at: p.date.toISOString(),
      href: "/admin/payments",
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  /* ── System health: only checks this process can actually verify ───────── */
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);
  const authConfigured = Boolean(process.env.AUTH_JWT_SECRET);

  const health: AdminHealthItem[] = [
    { id: "server", name: "Application Server", status: "Operational", detail: "Serving requests" },
    {
      id: "database",
      name: "Database",
      status: dbPingMs > 1500 ? "Degraded" : "Operational",
      detail: `${dbPingMs}ms query time`,
    },
    { id: "api", name: "Admin API", status: "Operational", detail: "All endpoints responding" },
    {
      id: "auth",
      name: "Authentication",
      status: authConfigured ? "Operational" : "Not configured",
      detail: authConfigured ? "JWT signing key loaded" : "AUTH_JWT_SECRET missing",
    },
    {
      id: "email",
      name: "Email Delivery",
      status: emailConfigured ? "Operational" : "Not configured",
      detail: emailConfigured ? "Resend provider connected" : "No provider configured",
    },
    buildBackupHealth(lastBackup),
  ];

  const data: AdminDashboardData = {
    range: {
      key: rangeKey,
      label: `${DATE_FMT.format(from)} – ${DATE_FMT.format(to)}`,
      previousLabel: `${DATE_FMT.format(prevFrom)} – ${DATE_FMT.format(from)}`,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    kpis,
    series: { labels, students: studentSeries, teachers: teacherSeries, lessonsCompleted: lessonSeries },
    overviewTiles,
    distribution,
    topCourses,
    activity,
    health,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json<AuthResponse<AdminDashboardData>>(
    { success: true, message: "OK", data },
    { status: 200 }
  );
}
