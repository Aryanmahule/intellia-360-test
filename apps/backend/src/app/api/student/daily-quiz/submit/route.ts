/**
 * POST /api/student/daily-quiz/submit
 *
 * Body: { answers: { [questionId]: selectedOptionId } }
 *
 * Flow:
 *   1. Idempotency — if already submitted today, return the stored result.
 *   2. Verify answers against the correct options from the question bank.
 *   3. Compute XP/gem rewards (base + perfect-score bonus).
 *   4. Update StudentProfile: xpPoints, learningGems, streakDays, lastActiveDate.
 *   5. Store DailyQuizAttempt.
 *   6. Unlock streak milestone badges (3/7/14/30/60/100 days) + perfect-score badge.
 *   7. Return detailed results with per-question correctness, rewards, new badges.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { getDailyQuestions, todayKey } from "@/lib/streak/questions";
import { getNewStreakBadges, PERFECT_SCORE_BADGE } from "@intellia360/shared/streak/badges";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

// ── Reward table ──────────────────────────────────────────────────────────────
// score 0-5 → base XP/gems
const XP_PER_CORRECT  = 15;
const GEM_PER_CORRECT = 5;
const STREAK_XP_BONUS = 10; // extra XP for keeping the streak alive

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export interface QuestionResult {
  questionId:        string;
  questionText:      string;
  selectedOptionId:  string;
  correctOptionId:   string;
  isCorrect:         boolean;
  explanation:       string;
}

export interface SubmitResponse {
  score:            number;       // 0–5
  totalQuestions:   number;
  xpAwarded:        number;
  gemsAwarded:      number;
  xpTotal:          number;
  gemsTotal:        number;
  streakDays:       number;
  streakKept:       boolean;       // true = streak extended; false = streak reset
  results:          QuestionResult[];
  newBadges:        { badgeId: string; title: string; emoji: string; description: string }[];
  alreadyCompleted: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const dateKey = todayKey();

    // ── 1. Idempotency ─────────────────────────────────────────────────────
    const existing = await db.dailyQuizAttempt.findUnique({
      where: { userId_dateKey: { userId: session.userId, dateKey } },
    });

    if (existing) {
      // Already submitted today — return the cached result
      const profile = await db.studentProfile.findUnique({
        where:  { userId: session.userId },
        select: { xpPoints: true, learningGems: true, streakDays: true },
      });
      return NextResponse.json<AuthResponse<SubmitResponse>>(
        {
          success: true,
          message: "You have already completed today's quiz.",
          data: {
            score:            existing.score,
            totalQuestions:   5,
            xpAwarded:        existing.xpAwarded,
            gemsAwarded:      existing.gemsAwarded,
            xpTotal:          profile?.xpPoints     ?? 0,
            gemsTotal:        profile?.learningGems  ?? 0,
            streakDays:       profile?.streakDays    ?? existing.streakDay,
            streakKept:       true,
            results:          [],
            newBadges:        [],
            alreadyCompleted: true,
          },
        },
        { status: 200 }
      );
    }

    // ── 2. Parse + validate body ───────────────────────────────────────────
    const body   = await request.json();
    const result = SubmitSchema.safeParse(body);
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
    const { answers } = result.data;

    // ── 3. Get today's questions (with correct answers) ────────────────────
    const profile = await db.studentProfile.findUnique({
      where: { userId: session.userId },
    });
    const grade = profile?.grade ?? "grade1";

    const questions = getDailyQuestions(session.userId, grade, dateKey);

    // ── 4. Grade the answers ───────────────────────────────────────────────
    const questionResults: QuestionResult[] = questions.map((q) => {
      const selected = answers[q.id] ?? "";
      const correct  = q.options.find((o) => o.isCorrect);
      return {
        questionId:       q.id,
        questionText:     q.questionText,
        selectedOptionId: selected,
        correctOptionId:  correct?.id ?? "",
        isCorrect:        selected === correct?.id,
        explanation:      q.explanation,
      };
    });

    const score = questionResults.filter((r) => r.isCorrect).length;

    // ── 5. Compute rewards ─────────────────────────────────────────────────
    const isPerfect   = score === questions.length;
    let xpBase        = score * XP_PER_CORRECT;
    let gemBase       = score * GEM_PER_CORRECT;
    const extraBadges: { badgeId: string; title: string; emoji: string; description: string }[] = [];

    // ── 6. Streak logic ────────────────────────────────────────────────────
    const todayStr = dateKey;
    const lastDate = profile?.lastActiveDate
      ? profile.lastActiveDate.toISOString().split("T")[0]
      : null;

    let newStreakDays: number;
    let streakKept   = false;

    if (!lastDate) {
      newStreakDays = 1;
      streakKept   = true;
    } else if (lastDate === todayStr) {
      // Already active today (from a lesson activity) — streak is intact
      newStreakDays = profile?.streakDays ?? 1;
      streakKept   = true;
    } else {
      const diffMs   = new Date(todayStr).getTime() - new Date(lastDate).getTime();
      const diffDays = Math.round(diffMs / 86_400_000);
      if (diffDays === 1) {
        newStreakDays = (profile?.streakDays ?? 1) + 1;
        streakKept   = true;
        xpBase      += STREAK_XP_BONUS; // bonus for keeping streak
      } else {
        newStreakDays = 1; // streak broken
        streakKept   = false;
      }
    }

    // Streak milestone badges
    const milestones = getNewStreakBadges(newStreakDays);
    for (const m of milestones) {
      xpBase  += m.xpBonus;
      gemBase += m.gemBonus;
      extraBadges.push({ badgeId: m.badgeId, title: m.title, emoji: m.emoji, description: m.description });
    }

    // Perfect score badge
    if (isPerfect) {
      xpBase  += PERFECT_SCORE_BADGE.xpBonus;
      gemBase += PERFECT_SCORE_BADGE.gemBonus;
      extraBadges.push({
        badgeId:     PERFECT_SCORE_BADGE.badgeId,
        title:       PERFECT_SCORE_BADGE.title,
        emoji:       PERFECT_SCORE_BADGE.emoji,
        description: PERFECT_SCORE_BADGE.description,
      });
    }

    // ── 7. Persist everything in one transaction ───────────────────────────
    const updated = await db.$transaction(async (tx) => {
      // Store attempt
      await tx.dailyQuizAttempt.create({
        data: {
          userId:      session.userId,
          dateKey,
          grade,
          questions:   questions as unknown as object[],
          answers,
          score,
          xpAwarded:   xpBase,
          gemsAwarded: gemBase,
          streakDay:   newStreakDays,
        },
      });

      // Update student profile
      const updatedProfile = await tx.studentProfile.update({
        where: { userId: session.userId },
        data: {
          xpPoints:      { increment: xpBase  },
          learningGems:  { increment: gemBase  },
          streakDays:    newStreakDays,
          lastActiveDate: new Date(),
        },
      });

      // Unlock new badges (idempotent upsert)
      for (const badge of extraBadges) {
        await tx.unlockedBadge.upsert({
          where:  { userId_badgeId: { userId: session.userId, badgeId: badge.badgeId } },
          create: { userId: session.userId, badgeId: badge.badgeId },
          update: {},
        });
      }

      return updatedProfile;
    });

    const response: SubmitResponse = {
      score,
      totalQuestions:   questions.length,
      xpAwarded:        xpBase,
      gemsAwarded:      gemBase,
      xpTotal:          updated.xpPoints,
      gemsTotal:        updated.learningGems,
      streakDays:       newStreakDays,
      streakKept,
      results:          questionResults,
      newBadges:        extraBadges,
      alreadyCompleted: false,
    };

    return NextResponse.json<AuthResponse<SubmitResponse>>(
      { success: true, message: isPerfect ? "Perfect score! 🎉" : "Quiz completed!", data: response },
      { status: 201 }
    );
  } catch (error) {
    console.error("[student/daily-quiz/submit]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
