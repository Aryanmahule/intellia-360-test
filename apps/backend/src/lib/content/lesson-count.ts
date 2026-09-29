import fs from "fs";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), "src", "data", "grades");

/**
 * Counts grades/lessons from the filesystem-backed curriculum store.
 * Read-only reuse of the same layout the editor module writes to.
 */
export function countGradesAndLessons(): { totalGrades: number; totalLessons: number } {
  let totalGrades = 0;
  let totalLessons = 0;

  if (fs.existsSync(DATA_ROOT)) {
    const dirs = fs
      .readdirSync(DATA_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    totalGrades = dirs.length;

    for (const g of dirs) {
      const lDir = path.join(DATA_ROOT, g, "lessons");
      totalLessons += fs.existsSync(lDir)
        ? fs.readdirSync(lDir).filter((f) => f.endsWith(".json")).length
        : 0;
    }
  }

  return { totalGrades, totalLessons };
}

/** Real per-grade lesson counts from the same filesystem-backed curriculum store. */
export function countLessonsByGrade(): Record<string, number> {
  const counts: Record<string, number> = {};

  if (fs.existsSync(DATA_ROOT)) {
    const dirs = fs
      .readdirSync(DATA_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const g of dirs) {
      const lDir = path.join(DATA_ROOT, g, "lessons");
      counts[g] = fs.existsSync(lDir)
        ? fs.readdirSync(lDir).filter((f) => f.endsWith(".json")).length
        : 0;
    }
  }

  return counts;
}

/**
 * Real size of the daily-quiz question bank shipped with the app.
 * Same filesystem-backed content store the lesson counts come from.
 */
export function countQuestionBank(): number {
  try {
    const file = path.join(process.cwd(), "src", "data", "daily-questions.json");
    if (!fs.existsSync(file)) return 0;
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
