/**
 * GET /api/student/quiz — every practice quiz available to this student's grade.
 *
 * Backs the /student/quiz index. One quiz per lesson in the grade's curriculum,
 * plus a mixed-practice set, with the student's best previous score where they
 * have already attempted one.
 */
import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { listQuizzesForGrade } from "@/lib/student/practice-quiz";

export interface StudentQuizListItem {
  quizId: string;
  lessonId: string | null;
  lessonTitle: string;
  chapterTitle: string | null;
  questionCount: number;
  estimatedMinutes: number;
  bestScore: number | null;
  attempts: number;
}

export async function GET() {
  const { session, errorResponse } = await requireStudentSession();
  if (errorResponse) return errorResponse;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { grade: true },
  });

  const grade = profile?.grade ?? "grade1";
  const quizzes = listQuizzesForGrade(grade);

  // One query for every attempt this student has made, then folded in memory —
  // cheaper than a per-quiz lookup across a whole grade's worth of lessons.
  const attempts = await db.quizAttempt.findMany({
    where: { userId: session.userId },
    select: { quizId: true, scorePercent: true },
  });

  const byQuiz = new Map<string, { best: number; count: number }>();
  for (const a of attempts) {
    const entry = byQuiz.get(a.quizId);
    if (!entry) byQuiz.set(a.quizId, { best: a.scorePercent, count: 1 });
    else {
      entry.count += 1;
      if (a.scorePercent > entry.best) entry.best = a.scorePercent;
    }
  }

  const data: StudentQuizListItem[] = quizzes.map((q) => {
    const stat = byQuiz.get(q.quizId);
    return {
      ...q,
      bestScore: stat?.best ?? null,
      attempts: stat?.count ?? 0,
    };
  });

  return NextResponse.json(
    { success: true, message: "OK", data, meta: { grade, total: data.length } },
    { status: 200 }
  );
}
