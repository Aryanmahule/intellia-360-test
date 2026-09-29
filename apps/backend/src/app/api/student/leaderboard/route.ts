import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notDeleted } from "@/lib/db-filters";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Seconds a CDN/browser may reuse a leaderboard response. */
const CACHE_SECONDS = 60;

/** Seconds a stale response may still be served while it revalidates. */
const STALE_SECONDS = 300;

import type { LeaderboardEntry, CurrentUserStats, LeaderboardResponse } from "@intellia360/shared/types/api/leaderboard";

export type { LeaderboardEntry, CurrentUserStats, LeaderboardResponse };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const grade = searchParams.get("grade") ?? undefined;

    const limitParam = parseInt(
      searchParams.get("limit") ?? String(DEFAULT_LIMIT),
      10
    );

    const limit = Number.isNaN(limitParam)
      ? DEFAULT_LIMIT
      : Math.min(Math.max(1, limitParam), MAX_LIMIT);

    // StudentProfile represents student accounts. Keep the explicit
    // student + notDeleted filter so deleted/non-student users are excluded.
    const where = {
      ...(grade ? { grade } : {}),
      user: { role: "STUDENT" as const, AND: [notDeleted()] },
    };

    const [profiles, total] = await Promise.all([
      db.studentProfile.findMany({
        where,
        select: {
          avatar: true,
          grade: true,
          xpPoints: true,
          learningGems: true,
          streakDays: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { xpPoints: "desc" },
          { learningGems: "desc" },
        ],
        take: limit,
      }),

      db.studentProfile.count({ where }),
    ]);

    const entries: LeaderboardEntry[] = profiles.map(
      (profile, index) => ({
        rank: index + 1,
        name: profile.user.name,
        avatar: profile.avatar,
        grade: profile.grade,
        xpPoints: profile.xpPoints,
        learningGems: profile.learningGems,
        streakDays: profile.streakDays,
        isCurrentUser: false,
      })
    );

    return NextResponse.json<AuthResponse<LeaderboardResponse>>(
      {
        success: true,
        message: "OK",
        data: {
          entries,
          total,
          currentUserRank: null,
          currentUserStats: null,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
        },
      }
    );
  } catch (error) {
    console.error("[student/leaderboard] Error:", error);

    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: "An unexpected error occurred",
      },
      {
        status: 500,
      }
    );
  }
}
