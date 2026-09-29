import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface MissionRecord {
  id: string;
  missionId: string;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null;
  updatedAt: string;
}

/**
 * Threshold map: how much progress is needed to auto-complete each mission.
 * Matches the logic from the deleted NestJS student.service.ts.
 */
const MISSION_MAX_PROGRESS: Record<string, number> = {
  m_1: 1,   // Complete your first lesson
  m_2: 3,   // Complete 3 lessons
  m_3: 14,  // Complete 14 lessons (full chapter)
};

const DEFAULT_MAX_PROGRESS = 1;

// GET /api/student/missions — list all mission progress records
export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const missions = await db.missionProgress.findMany({
      where: { userId: session.userId },
      orderBy: { missionId: "asc" },
    });

    const data: MissionRecord[] = missions.map((m) => ({
      id: m.id,
      missionId: m.missionId,
      progress: m.progress,
      isCompleted: m.isCompleted,
      completedAt: m.completedAt?.toISOString() ?? null,
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json<AuthResponse<MissionRecord[]>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/missions GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

const UpdateMissionSchema = z.object({
  missionId: z.string().min(1, "missionId is required"),
  progress: z.number().int().min(0, "progress must be a non-negative integer"),
});

// PATCH /api/student/missions — upsert mission progress, auto-complete at threshold
export async function PATCH(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = UpdateMissionSchema.safeParse(body);
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

    const { missionId, progress } = result.data;

    const existingMission = await db.missionProgress.findUnique({
      where: {
        userId_missionId: { userId: session.userId, missionId },
      },
    });

    const maxProgress = MISSION_MAX_PROGRESS[missionId] ?? DEFAULT_MAX_PROGRESS;
    const clampedProgress = Math.min(progress, maxProgress);
    const isCompleted = clampedProgress >= maxProgress;
    const isNewlyCompleted = isCompleted && (!existingMission || !existingMission.isCompleted);

    const mission = await db.missionProgress.upsert({
      where: {
        userId_missionId: { userId: session.userId, missionId },
      },
      create: {
        userId: session.userId,
        missionId,
        progress: clampedProgress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      update: {
        progress: clampedProgress,
        isCompleted,
        // Only set completedAt the first time it completes
        ...(isCompleted ? { completedAt: new Date() } : {}),
      },
    });

    if (isNewlyCompleted) {
      const missionTitles: Record<string, string> = {
        m_1: "Completed your first lesson",
        m_2: "Completed 3 lessons adventure",
        m_3: "Completed full chapter",
      };

      await db.notification.create({
        data: {
          userId: session.userId,
          type: "achievement",
          tabCategory: "achievements",
          icon: "🎯",
          iconBg: "rgba(245, 158, 11, 0.12)",
          title: `Mission Completed: ${missionTitles[missionId] || "Daily Learning Quest"}!`,
          description: "Congratulations on achieving your learning mission milestone.",
          categoryTag: "Achievement",
          actionUrl: "/student/dashboard",
          actionText: "View Dashboard →",
          isRead: false,
        },
      });
    }

    const data: MissionRecord = {
      id: mission.id,
      missionId: mission.missionId,
      progress: mission.progress,
      isCompleted: mission.isCompleted,
      completedAt: mission.completedAt?.toISOString() ?? null,
      updatedAt: mission.updatedAt.toISOString(),
    };

    return NextResponse.json<AuthResponse<MissionRecord>>(
      { success: true, message: isCompleted ? "Mission completed!" : "Mission progress updated", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/missions PATCH]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
