import { db } from "@/lib/db";

export const normSchoolKey = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Computes live teacher/student counts per school by matching the free-text
 * schoolName/school fields on the profile tables — one groupBy per table
 * regardless of how many schools exist (avoids N+1 queries).
 */
export async function computeSchoolCounts(): Promise<Map<string, { teachers: number; students: number }>> {
  const [teacherGroups, studentGroups] = await Promise.all([
    db.teacherProfile.groupBy({ by: ["schoolName"], _count: { _all: true } }),
    db.studentProfile.groupBy({ by: ["school"], _count: { _all: true } }),
  ]);

  const counts = new Map<string, { teachers: number; students: number }>();
  for (const t of teacherGroups) {
    const key = normSchoolKey(t.schoolName);
    if (!key) continue;
    counts.set(key, { teachers: t._count._all, students: counts.get(key)?.students ?? 0 });
  }
  for (const s of studentGroups) {
    const key = normSchoolKey(s.school);
    if (!key) continue;
    counts.set(key, { teachers: counts.get(key)?.teachers ?? 0, students: s._count._all });
  }
  return counts;
}
