/**
 * POST /api/student/quiz/submit
 *
 * Grades a practice quiz and records the attempt.
 *
 * The answer key never reaches the browser, so scoring re-derives the same
 * question set server-side from the quiz id and the student's grade and marks
 * the submitted answers against it. `lessonId` in the request body is accepted
 * for the client's convenience but never trusted — it is recomputed here.
 *
 * A static route segment beats a dynamic one in the App Router, so this sits
 * alongside /api/student/quiz/[quizId] without shadowing it.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { gradeQuiz } from "@/lib/student/practice-quiz";
import type { AuthResponse } from "@intellia360/shared/types/auth";

/** XP for a completed practice quiz, scaled by score. */
const MAX_XP = 50;

const SubmitSchema = z.object({
  quizId: z.string().trim().min(1).max(200),
  lessonId: z.string().trim().max(200).optional(),
  answers: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireStudentSession();
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 }
    );
  }

  const { quizId, answers } = parsed.data;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, grade: true, xpPoints: true },
  });

  const grade = profile?.grade ?? "grade1";
  const result = gradeQuiz(quizId, grade, answers);

  if (!result) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "That quiz isn't available yet." },
      { status: 404 }
    );
  }

  const xpEarned = Math.round((result.scorePercent / 100) * MAX_XP);

  // The attempt is the record of record; the XP top-up is best-effort so a
  // profile that does not exist yet cannot fail an otherwise valid submission.
  await db.quizAttempt.create({
    data: {
      userId: session.userId,
      lessonId: result.lessonId,
      quizId: result.quizId,
      scorePercent: result.scorePercent,
    },
  });

  if (profile) {
    await db.studentProfile.update({
      where: { id: profile.id },
      data: { xpPoints: { increment: xpEarned }, lastActiveDate: new Date() },
    });
  }

  return NextResponse.json(
    {
      success: true,
      message: "Quiz submitted",
      data: {
        quizId: result.quizId,
        lessonId: result.lessonId,
        scorePercent: result.scorePercent,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        xpEarned,
      },
    },
    { status: 201 }
  );
}
