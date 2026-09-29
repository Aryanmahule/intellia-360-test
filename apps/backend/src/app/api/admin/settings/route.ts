/**
 * GET /api/admin/settings  — ADMIN-only: read platform settings (singleton)
 * PUT /api/admin/settings  — ADMIN-only: persist platform settings
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const SETTINGS_ID = "global";

const SettingsSchema = z.object({
  platformName: z.string().default(""),
  supportEmail: z.string().default(""),
  academicYear: z.string().default(""),
  primaryColor: z.string().default("#f97316"),
  logoDisplay: z.string().default("badge-text"),
  emailSchoolRegistration: z.boolean().default(false),
  emailWeeklySummary: z.boolean().default(false),
  emailRenewalAlert: z.boolean().default(false),
  twoFactor: z.string().default("mandatory"),
  sessionTimeoutMinutes: z.coerce.number().int().default(30),
  aiModel: z.string().default("fast"),
  dailyQueries: z.coerce.number().int().default(0),
});

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const settings =
    (await db.adminSettings.findUnique({ where: { id: SETTINGS_ID } })) ??
    (await db.adminSettings.create({ data: { id: SETTINGS_ID } }));

  return NextResponse.json<AuthResponse<typeof settings>>(
    { success: true, message: "OK", data: settings },
    { status: 200 }
  );
}

export async function PUT(req: NextRequest) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const result = SettingsSchema.partial().safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Validation failed", errors: result.error.flatten().fieldErrors as Record<string, string[]> },
      { status: 422 }
    );
  }

  const settings = await db.adminSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...result.data },
    update: result.data,
  });

  return NextResponse.json<AuthResponse<typeof settings>>(
    { success: true, message: "Settings saved.", data: settings },
    { status: 200 }
  );
}
