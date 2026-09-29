/**
 * GET /api/editor/stats  — dashboard aggregate stats
 *
 * Content counters only. User accounts are managed from the admin console
 * (/admin/users), so nothing about users is exposed to the editor role here.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireEditorSession } from "@/lib/editor/require-editor-session";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const DATA_ROOT = path.join(process.cwd(), "src", "data", "grades");

export interface EditorStats {
  totalGrades: number;
  totalLessons: number;
  gradesWithNoLessons: string[];
}

export async function GET() {
  const { errorResponse } = await requireEditorSession();
  if (errorResponse) return errorResponse;

  let totalGrades = 0;
  let totalLessons = 0;
  const gradesWithNoLessons: string[] = [];

  if (fs.existsSync(DATA_ROOT)) {
    const dirs = fs
      .readdirSync(DATA_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    totalGrades = dirs.length;

    for (const g of dirs) {
      const lDir = path.join(DATA_ROOT, g, "lessons");
      const count = fs.existsSync(lDir)
        ? fs.readdirSync(lDir).filter((f) => f.endsWith(".json")).length
        : 0;
      totalLessons += count;
      if (count === 0) gradesWithNoLessons.push(g);
    }
  }

  const stats: EditorStats = {
    totalGrades,
    totalLessons,
    gradesWithNoLessons,
  };

  return NextResponse.json<AuthResponse<EditorStats>>(
    { success: true, message: "OK", data: stats },
    { status: 200 }
  );
}
