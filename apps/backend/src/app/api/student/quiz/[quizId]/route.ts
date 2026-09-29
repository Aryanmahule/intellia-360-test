/**
 * GET /api/student/quiz/[quizId]
 *
 * Serves one practice quiz for the signed-in student's grade. The quiz page has
 * always called this route; it never existed, which is why every quiz rendered
 * "Quiz unavailable".
 *
 * Options come back without their answer key — grading happens in
 * POST /api/student/quiz/submit against the server's own copy.
 */
import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { buildQuiz } from "@/lib/student/practice-quiz";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ quizId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, errorResponse } = await requireStudentSession();
  if (errorResponse) return errorResponse;

  const { quizId } = await params;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { grade: true },
  });

  // Grade drives which questions are in scope; fall back to grade1 rather than
  // serving nothing to an account whose profile has not been set up yet.
  const grade = profile?.grade ?? "grade1";
  const quiz = buildQuiz(quizId, grade);

  if (!quiz) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "That quiz isn't available yet." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { success: true, message: "OK", data: quiz },
    { status: 200 }
  );
}
