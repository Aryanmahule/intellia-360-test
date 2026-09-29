import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CreateQuizAttemptSchema = z.object({
  lessonId: z.string().min(1, "lessonId is required"),
  quizId: z.string().min(1, "quizId is required"),
  scorePercent: z
    .number()
    .int("scorePercent must be an integer")
    .min(0, "scorePercent must be between 0 and 100")
    .max(100, "scorePercent must be between 0 and 100"),
});

export interface QuizAttemptRecord {
  id: string;
  lessonId: string;
  quizId: string;
  scorePercent: number;
  submittedAt: string;
}

// POST /api/student/quiz-attempts — record a quiz attempt
export async function POST(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = CreateQuizAttemptSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors as Record<string, string[]>,
        },
        { status: 422 }
      );
    }

    const { lessonId, quizId, scorePercent } = result.data;

    const attempt = await db.quizAttempt.create({
      data: {
        userId: session.userId,
        lessonId,
        quizId,
        scorePercent,
      },
    });

    const isPerfect = scorePercent === 100;
    await db.notification.create({
      data: {
        userId: session.userId,
        type: "quiz",
        tabCategory: "learning",
        icon: "🏆",
        iconBg: "rgba(16, 185, 129, 0.12)",
        title: isPerfect
          ? "Quiz Completed: 100% Perfect Score!"
          : `Quiz Completed: ${scorePercent}% Score!`,
        description: isPerfect
          ? `Outstanding! You scored 100% on the quiz challenge.`
          : `You scored ${scorePercent}% on your quiz challenge. Keep up the practice!`,
        categoryTag: "Quiz Result",
        actionUrl: "/student/dashboard",
        actionText: "Review Score →",
        isRead: false,
      },
    });

    const data: QuizAttemptRecord = {
      id: attempt.id,
      lessonId: attempt.lessonId,
      quizId: attempt.quizId,
      scorePercent: attempt.scorePercent,
      submittedAt: attempt.submittedAt.toISOString(),
    };

    return NextResponse.json<AuthResponse<QuizAttemptRecord>>(
      { success: true, message: "Quiz attempt recorded", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("[student/quiz-attempts]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
