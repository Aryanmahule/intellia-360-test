import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface BadgeRecord {
  id: string;
  badgeId: string;
  unlockedAt: string;
}

// GET /api/student/badges — list all unlocked badges
export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const badges = await db.unlockedBadge.findMany({
      where: { userId: session.userId },
      orderBy: { unlockedAt: "asc" },
    });

    const data: BadgeRecord[] = badges.map((b) => ({
      id: b.id,
      badgeId: b.badgeId,
      unlockedAt: b.unlockedAt.toISOString(),
    }));

    return NextResponse.json<AuthResponse<BadgeRecord[]>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/badges GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

const UnlockBadgeSchema = z.object({
  badgeId: z.string().min(1, "badgeId is required"),
});

// POST /api/student/badges — unlock a badge (idempotent)
export async function POST(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = UnlockBadgeSchema.safeParse(body);
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

    const { badgeId } = result.data;

    // Check if already unlocked
    const existing = await db.unlockedBadge.findUnique({
      where: {
        userId_badgeId: { userId: session.userId, badgeId },
      },
    });

    const badge = await db.unlockedBadge.upsert({
      where: {
        userId_badgeId: { userId: session.userId, badgeId },
      },
      create: { userId: session.userId, badgeId },
      update: {}, // no-op if already exists
    });

    if (!existing) {
      const badgeTitles: Record<string, { title: string; desc: string }> = {
        b_1: { title: "Place Value Master", desc: "Completed all Place Value visual and interactive exercises" },
        b_2: { title: "Streak Champion", desc: "Maintained a 7-day active daily learning streak" },
        b_3: { title: "First Steps Explorer", desc: "Completed your very first lesson adventure" },
        b_4: { title: "Quiz Ace", desc: "Scored 100% in a practice challenge quiz" },
        b_5: { title: "Gem Collector", desc: "Accumulated over 100 Learning Gems across activities" },
        b_6: { title: "Math Pioneer", desc: "Completed 5 or more curriculum lessons in your grade" },
      };

      const info = badgeTitles[badgeId] || {
        title: `Badge Unlocked: ${badgeId.toUpperCase()}`,
        desc: "You have unlocked a new learning achievement badge!",
      };

      await db.notification.create({
        data: {
          userId: session.userId,
          type: "achievement",
          tabCategory: "achievements",
          icon: "🎉",
          iconBg: "rgba(245, 158, 11, 0.12)",
          title: `Achievement Unlocked: ${info.title}!`,
          description: info.desc,
          categoryTag: "Achievement",
          actionUrl: "/student/profile",
          actionText: "View in Badges →",
          isRead: false,
        },
      });
    }

    const data: BadgeRecord = {
      id: badge.id,
      badgeId: badge.badgeId,
      unlockedAt: badge.unlockedAt.toISOString(),
    };

    return NextResponse.json<AuthResponse<BadgeRecord>>(
      { success: true, message: "Badge unlocked", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("[student/badges POST]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
