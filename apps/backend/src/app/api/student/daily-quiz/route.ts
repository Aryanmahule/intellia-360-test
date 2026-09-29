/**
 * GET /api/student/daily-quiz
 *
 * Returns today's 5 questions for the authenticated student.
 * Questions are deterministically seeded by userId + UTC date so every
 * re-fetch on the same day returns the same set.
 *
 * Also returns:
 *   - alreadyCompleted: boolean  (true = student already submitted today)
 *   - attempt: the stored attempt if already completed
 *   - streakDays: current streak from StudentProfile
 */
import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { getDailyQuestions, todayKey } from "@/lib/streak/questions";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";
import type { DailyQuestion } from "@/lib/streak/questions";

export interface DailyQuizResponse {
  dateKey:          string;
  questions:        DailyQuestion[];
  alreadyCompleted: boolean;
  attempt?:         {
    score:        number;
    xpAwarded:    number;
    gemsAwarded:  number;
    streakDay:    number;
    completedAt:  string;
    answers:      Record<string, string>;
  };
  streakDays:       number;
  grade:            string;
}

export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const dateKey = todayKey();

    // Fetch profile (grade + streakDays)
    const profile = await db.studentProfile.findUnique({
      where:  { userId: session.userId },
      select: { grade: true, streakDays: true },
    });
    const grade      = profile?.grade      ?? "grade1";
    const streakDays = profile?.streakDays ?? 1;

    // Check for existing attempt today
    const existing = await db.dailyQuizAttempt.findUnique({
      where: { userId_dateKey: { userId: session.userId, dateKey } },
    });

    const questions = getDailyQuestions(session.userId, grade, dateKey);

    // Strip isCorrect from options before sending to client
    const safeQuestions = questions.map((q) => ({
      ...q,
      options: q.options.map(({ id, text }) => ({ id, text })),
    }));

    const data: DailyQuizResponse = {
      dateKey,
      questions:        safeQuestions as DailyQuestion[],
      alreadyCompleted: !!existing,
      streakDays,
      grade,
      ...(existing
        ? {
            attempt: {
              score:       existing.score,
              xpAwarded:   existing.xpAwarded,
              gemsAwarded: existing.gemsAwarded,
              streakDay:   existing.streakDay,
              completedAt: existing.completedAt.toISOString(),
              answers:     existing.answers as Record<string, string>,
            },
          }
        : {}),
    };

    return NextResponse.json<AuthResponse<DailyQuizResponse>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/daily-quiz GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
