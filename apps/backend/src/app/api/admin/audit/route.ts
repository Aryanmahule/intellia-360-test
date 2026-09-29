/**
 * GET /api/admin/audit — ADMIN-only: read the audit trail.
 *
 * Query parameters
 *   page, limit        pagination (limit capped at 100)
 *   action             exact action, e.g. "user.role.change"
 *   entityType         "User" | "Course" | "School" | "ContentResource" | …
 *   entityId           full history for one record
 *   actorId            everything one administrator did
 *   from, to           ISO dates bounding createdAt
 *   q                  substring match on the human summary
 *
 * The trail is append-only: there is no POST, PATCH or DELETE here. Entries are
 * written by lib/audit.ts and removed only by the retention sweep in
 * scripts/db-maintenance.mjs.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { literalSearch } from "@/lib/db-filters";
import type { Prisma } from "@prisma/client";

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const action = searchParams.get("action") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const entityId = searchParams.get("entityId") ?? undefined;
  const actorId = searchParams.get("actorId") ?? undefined;
  const q = searchParams.get("q") ?? "";

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
    ...(q ? { summary: { contains: literalSearch(q), mode: "insensitive" } } : {}),
  };

  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      // `ip` and `userAgent` are intentionally not selected: they are retained
      // for incident response, not for routine browsing of the trail.
      select: {
        id: true,
        actorId: true,
        actorEmail: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        before: true,
        after: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const rows: AuditLogRow[] = entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: rows,
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    { status: 200 }
  );
}
