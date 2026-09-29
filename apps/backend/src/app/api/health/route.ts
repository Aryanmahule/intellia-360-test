/**
 * GET /api/health
 *
 * Liveness check for the deploy script (deploy/deploy.sh) and uptime
 * monitoring: 200 when the API is up and can reach MongoDB, 503 otherwise.
 * Public and unauthenticated; it reveals nothing beyond up/down.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$runCommandRaw({ ping: 1 });
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] database ping failed:", error);
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
