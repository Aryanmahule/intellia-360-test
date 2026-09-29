/**
 * GET  /api/admin/content  — ADMIN-only: list content resources (paged, filtered)
 * POST /api/admin/content  — ADMIN-only: add a content resource
 *
 * No object-storage provider is configured for this project, so resources
 * are metadata + an optional external URL rather than uploaded file bytes.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import { literalSearch, notArchived } from "@/lib/db-filters";
import { recordAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CATEGORIES = ["edunotes", "visual-models", "videos", "ai-prompts"] as const;

const CreateContentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(CATEGORIES),
  url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const q = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const category = CATEGORIES.includes(categoryParam as (typeof CATEGORIES)[number])
    ? (categoryParam as string)
    : undefined;
  const includeArchived = searchParams.get("includeArchived") === "true";

  const where: Prisma.ContentResourceWhereInput = {
    // notArchived() rather than `archivedAt: null` — see src/lib/db-filters.ts.
    ...(includeArchived ? {} : { AND: [notArchived()] }),
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: literalSearch(q), mode: "insensitive" } },
            { description: { contains: literalSearch(q), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    db.contentResource.count({ where }),
    db.contentResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: items,
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const result = CreateContentSchema.safeParse(body);
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

  const { title, description, category, url } = result.data;

  // The same title in the same category is almost always a double-submitted
  // form rather than a genuinely distinct resource.
  const duplicate = await db.contentResource.findFirst({
    where: { category, title: { equals: title, mode: "insensitive" }, AND: [notArchived()] },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: `"${title}" already exists in ${category}.` },
      { status: 409 }
    );
  }

  const item = await db.contentResource.create({
    data: { title, description, category, url: url || undefined },
  });

  await recordAudit({
    actor: { userId: session.userId, email: session.email, role: session.role },
    action: "content.create",
    entityType: "ContentResource",
    entityId: item.id,
    summary: `Added content resource "${item.title}" (${item.category})`,
    after: item,
    request: req,
  });

  return NextResponse.json<AuthResponse<typeof item>>(
    { success: true, message: "Resource added.", data: item },
    { status: 201 }
  );
}
