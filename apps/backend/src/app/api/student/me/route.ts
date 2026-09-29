import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface StudentProfileResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  grade: string;
  xpPoints: number;
  learningGems: number;
  streakDays: number;
  lastActiveDate: string | null;
  classId: string | null;
}

export async function GET() {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    // Fetch user + profile in one query
    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: { studentProfile: true },
    });

    if (!user) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let profile = user.studentProfile;

    // Auto-create profile if missing (e.g. user registered before this code existed)
    if (!profile) {
      profile = await db.studentProfile.create({
        data: {
          userId: user.id,
          grade: "grade1",
          xpPoints: 0,
          learningGems: 0,
          streakDays: 1,
          lastActiveDate: new Date(),
        },
      });
    } else {
      // Calculate daily streak update on new day login
      const todayStr = new Date().toISOString().split("T")[0];
      const lastActiveStr = profile.lastActiveDate
        ? profile.lastActiveDate.toISOString().split("T")[0]
        : null;

      if (!lastActiveStr) {
        profile = await db.studentProfile.update({
          where: { id: profile.id },
          data: { lastActiveDate: new Date() },
        });
      } else if (lastActiveStr !== todayStr) {
        const lastDate = new Date(lastActiveStr);
        const todayDate = new Date(todayStr);
        const diffDays = Math.round(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)
        );
        const newStreak = diffDays === 1 ? (profile.streakDays || 1) + 1 : 1;

        profile = await db.studentProfile.update({
          where: { id: profile.id },
          data: { streakDays: newStreak, lastActiveDate: new Date() },
        });

        // Streak milestone notification
        if (newStreak > 1 && [3, 7, 14, 30, 50, 100].includes(newStreak)) {
          await db.notification.create({
            data: {
              userId: user.id,
              type: "streak",
              tabCategory: "achievements",
              icon: "🔥",
              iconBg: "rgba(249, 115, 22, 0.12)",
              title: `Streak Milestone: ${newStreak}-Day Active Learning Streak!`,
              description: `Awesome dedication! You've maintained your active learning streak for ${newStreak} days in a row.`,
              categoryTag: "Streak",
              actionUrl: "/student/profile",
              actionText: "Check Streak Status →",
              isRead: false,
            },
          });
        }
      }
    }

    const data: StudentProfileResponse = {
      id: profile.id,
      userId: profile.userId,
      name: user.name,
      email: user.email,
      avatar: profile.avatar,
      grade: profile.grade,
      xpPoints: profile.xpPoints,
      learningGems: profile.learningGems,
      streakDays: profile.streakDays,
      lastActiveDate: profile.lastActiveDate?.toISOString() ?? null,
      classId: profile.classId,
    };

    return NextResponse.json<AuthResponse<StudentProfileResponse>>(
      { success: true, message: "OK", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/me GET]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60).optional(),
  grade: z.string().min(1, "Grade is required").optional(),
  avatar: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = UpdateProfileSchema.safeParse(body);
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

    const { name, grade, avatar } = result.data;

    // Update user name if provided
    let updatedUser = await db.user.findUnique({
      where: { id: session.userId },
      include: { studentProfile: true },
    });

    if (!updatedUser) {
      return NextResponse.json<AuthResponse>(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (name && name !== updatedUser.name) {
      updatedUser = await db.user.update({
        where: { id: session.userId },
        data: { name },
        include: { studentProfile: true },
      });
    }

    // Update student profile
    const profileUpdateData: Record<string, unknown> = {};
    if (grade !== undefined) profileUpdateData.grade = grade;
    if (avatar !== undefined) profileUpdateData.avatar = avatar;

    let profile = updatedUser.studentProfile;
    if (Object.keys(profileUpdateData).length > 0 || !profile) {
      profile = await db.studentProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          grade: grade || "grade1",
          avatar: avatar || null,
          xpPoints: 0,
          learningGems: 0,
          streakDays: 1,
          lastActiveDate: new Date(),
        },
        update: profileUpdateData,
      });
    }

    const data: StudentProfileResponse = {
      id: profile.id,
      userId: profile.userId,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: profile.avatar,
      grade: profile.grade,
      xpPoints: profile.xpPoints,
      learningGems: profile.learningGems,
      streakDays: profile.streakDays,
      lastActiveDate: profile.lastActiveDate?.toISOString() ?? null,
      classId: profile.classId,
    };

    return NextResponse.json<AuthResponse<StudentProfileResponse>>(
      { success: true, message: "Profile updated successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/me PATCH]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

