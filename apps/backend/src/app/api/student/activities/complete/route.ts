import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { resolveActivityReward, KNOWN_ACTIVITY_TYPES } from "@/lib/student/rewards";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const CompleteActivitySchema = z.object({
  lessonId: z.string().min(1, "lessonId is required"),
  activityType: z.enum(KNOWN_ACTIVITY_TYPES as [string, ...string[]]),
  grade: z.string().regex(/^grade\d{1,2}$/).optional().default("grade1"),
  // xpReward / gemsReward are still accepted for backwards compatibility with
  // the existing client, but they are IGNORED — the server decides the award.
  // Trusting these let any student POST themselves an arbitrary XP balance.
  xpReward: z.number().int().min(0).optional(),
  gemsReward: z.number().int().min(0).optional(),
});

/** Activity types that also mark the parent lesson as completed. */
const LESSON_COMPLETING_TYPES = new Set(["architecture", "practice"]);

export interface CompleteActivityResponse {
  alreadyCompleted: boolean;
  xpAwarded: number;
  gemsAwarded: number;
  xpTotal: number;
  gemsTotal: number;
}

export async function POST(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = CompleteActivitySchema.safeParse(body);
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

    const { lessonId, activityType, grade } = result.data;
    const { xp: xpReward, gems: gemsReward } = resolveActivityReward(
      activityType,
      grade,
      lessonId
    );

    // ── Idempotency check ──────────────────────────────────────────────────
    const existing = await db.completedActivity.findUnique({
      where: {
        userId_lessonId_activityType: {
          userId: session.userId,
          lessonId,
          activityType,
        },
      },
    });

    if (existing) {
      // Already completed — return current totals without awarding again
      const profile = await db.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { xpPoints: true, learningGems: true },
      });

      return NextResponse.json<AuthResponse<CompleteActivityResponse>>(
        {
          success: true,
          message: "Activity already completed",
          data: {
            alreadyCompleted: true,
            xpAwarded: 0,
            gemsAwarded: 0,
            xpTotal: profile?.xpPoints ?? 0,
            gemsTotal: profile?.learningGems ?? 0,
          },
        },
        { status: 200 }
      );
    }

    // ── Transactional write ────────────────────────────────────────────────
    // 1. Create CompletedActivity record
    // 2. Increment XP and gems on StudentProfile (upsert in case profile missing)
    // 3. If activityType is architecture or practice → upsert CompletedLesson
    const updatedProfile = await db.$transaction(async (tx) => {
      await tx.completedActivity.create({
        data: {
          userId: session.userId,
          lessonId,
          activityType,
          xpAwarded: xpReward,
          gemsAwarded: gemsReward,
        },
      });

      const profile = await tx.studentProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          grade,
          xpPoints: xpReward,
          learningGems: gemsReward,
          streakDays: 1,
          lastActiveDate: new Date(),
        },
        update: {
          xpPoints: { increment: xpReward },
          learningGems: { increment: gemsReward },
          lastActiveDate: new Date(),
        },
      });

      if (LESSON_COMPLETING_TYPES.has(activityType)) {
        await tx.completedLesson.upsert({
          where: {
            userId_lessonId: { userId: session.userId, lessonId },
          },
          create: { userId: session.userId, lessonId, grade },
          update: {}, // no-op if already exists
        });

        const formattedLessonName = lessonId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        await tx.notification.create({
          data: {
            userId: session.userId,
            type: "lesson",
            tabCategory: "learning",
            icon: "📚",
            iconBg: "rgba(59, 130, 246, 0.12)",
            title: `Lesson Completed: ${formattedLessonName}`,
            description: `Great progress! You completed the ${activityType} activity in ${formattedLessonName}.`,
            categoryTag: "Lesson Completed",
            actionUrl: "/student/dashboard",
            actionText: "Continue Learning →",
            isRead: false,
          },
        });
      }

      if (xpReward > 0 || gemsReward > 0) {
        await tx.notification.create({
          data: {
            userId: session.userId,
            type: "xp",
            tabCategory: "achievements",
            icon: "⭐",
            iconBg: "rgba(245, 158, 11, 0.12)",
            title: `XP & Gems Awarded: +${xpReward} XP${gemsReward > 0 ? ` and +${gemsReward} Gems` : ""}`,
            description: `You earned rewards for completing ${activityType} activities. Keep it up!`,
            categoryTag: "Rewards",
            actionUrl: "/student/profile",
            actionText: "View Balance →",
            isRead: false,
          },
        });
      }

      return profile;
    });

    return NextResponse.json<AuthResponse<CompleteActivityResponse>>(
      {
        success: true,
        message: "Activity completed",
        data: {
          alreadyCompleted: false,
          xpAwarded: xpReward,
          gemsAwarded: gemsReward,
          xpTotal: updatedProfile.xpPoints,
          gemsTotal: updatedProfile.learningGems,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[student/activities/complete]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
