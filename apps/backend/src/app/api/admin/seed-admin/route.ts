/**
 * POST /api/admin/seed-admin
 *
 * ONE-TIME bootstrap route. Creates the first admin account if no admin
 * exists yet. Self-destructs by returning 410 Gone once an admin exists.
 *
 * DELETE THIS FILE after the first admin has been created.
 */
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/hash";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest) {
  // If any admin already exists, refuse
  const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    return NextResponse.json(
      { success: false, message: "An admin already exists. Remove this endpoint." },
      { status: 410 }
    );
  }

  // Same identity the seed uses, from the same environment variables, so the
  // two bootstrap paths can never disagree about who the platform admin is.
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "intelliasg@gmail.com";
  const adminName = process.env.ADMIN_NAME?.trim() || "Platform Admin";

  // No fallback here. The seed may default to the shared demo password because
  // it only ever runs against a local database; this endpoint is reachable on a
  // deployed instance, so it refuses rather than create an admin whose password
  // is published in the repository.
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        success: false,
        message:
          "ADMIN_PASSWORD is not set. Set it in the environment before bootstrapping an admin.",
      },
      { status: 500 }
    );
  }

  const password = await hashPassword(process.env.ADMIN_PASSWORD);

  const admin = await db.user.create({
    data: {
      email:         adminEmail,
      name:          adminName,
      password,
      role:          "ADMIN",
      emailVerified: true,
    },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json(
    {
      success: true,
      message: `✅ Admin created for ${adminEmail} with the configured ADMIN_PASSWORD — now DELETE this file.`,
      data:    admin,
    },
    { status: 201 }
  );
}
