import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import type { AuthResponse } from "@intellia360/shared/types/auth";

const UpdateGradeSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
});

export async function PATCH(request: NextRequest) {
  try {
    const { session, errorResponse } = await requireStudentSession();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const result = UpdateGradeSchema.safeParse(body);
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

    const { grade } = result.data;

    const profile = await db.studentProfile.update({
      where: { userId: session.userId },
      data: { grade },
    });

    return NextResponse.json<AuthResponse<{ grade: string }>>(
      { success: true, message: "Grade updated", data: { grade: profile.grade } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[student/grade]", error);
    return NextResponse.json<AuthResponse>(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
