/**
 * GET /api/admin/reports/export?type=rep_1|rep_2|rep_3|rep_4|all
 * ADMIN-only: generates a CSV export from real DB data for the requested
 * report card. No PDF/reporting framework — CSV only, per scope.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { computeSchoolCounts, normSchoolKey } from "@/lib/admin/school-stats";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

async function buildSection(type: string): Promise<{ title: string; csv: string }> {
  switch (type) {
    case "rep_1": {
      const users = await db.user.findMany({
        select: { name: true, email: true, role: true, emailVerified: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: "Daily Active Users & Engagement",
        csv: toCsv(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))),
      };
    }
    case "rep_2": {
      const [schools, counts] = await Promise.all([
        db.school.findMany({ select: { name: true, location: true, plan: true, status: true } }),
        computeSchoolCounts(),
      ]);
      const rows = schools.map((s) => {
        const c = counts.get(normSchoolKey(s.name));
        return { ...s, teachersCount: c?.teachers ?? 0, studentsCount: c?.students ?? 0 };
      });
      return { title: "Weekly School Performance Summary", csv: toCsv(rows) };
    }
    case "rep_3": {
      const payments = await db.payment.findMany({
        select: { transactionId: true, payerName: true, schoolOrUser: true, amount: true, method: true, status: true, date: true },
        orderBy: { date: "desc" },
      });
      return {
        title: "Monthly Financial & Subscription Revenue",
        csv: toCsv(payments.map((p) => ({ ...p, date: p.date.toISOString() }))),
      };
    }
    case "rep_4": {
      const [roleCounts, verifiedCount, totalUsers, rateLimitRecords] = await Promise.all([
        db.user.groupBy({ by: ["role"], _count: { role: true } }),
        db.user.count({ where: { emailVerified: true } }),
        db.user.count(),
        db.rateLimitRecord.count(),
      ]);
      const rows = [
        { metric: "Total Users", value: totalUsers },
        { metric: "Verified Users", value: verifiedCount },
        { metric: "Unverified Users", value: totalUsers - verifiedCount },
        ...roleCounts.map((r) => ({ metric: `Role: ${r.role}`, value: r._count.role })),
        { metric: "Rate Limit Records (last-window activity)", value: rateLimitRecords },
      ];
      return { title: "Platform Infrastructure & Security Audit", csv: toCsv(rows) };
    }
    default:
      return { title: "Unknown Report", csv: "" };
  }
}

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const type = req.nextUrl.searchParams.get("type") ?? "rep_1";
  const types = type === "all" ? ["rep_1", "rep_2", "rep_3", "rep_4"] : [type];

  const sections = await Promise.all(types.map(buildSection));

  const body = sections
    .map((s) => `# ${s.title}\n${s.csv || "No data available yet."}`)
    .join("\n\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-report-${type}.csv"`,
    },
  });
}
