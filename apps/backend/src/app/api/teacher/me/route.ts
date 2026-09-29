/**
 * GET /api/teacher/me — teacher profile stub
 * Returns basic teacher stats from the DB.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeacherSession } from "@/lib/teacher/require-teacher-session";

export async function GET() {
  // Same role guard as every other teacher route. This one only checked that a
  // session existed, so a student or editor session got a 200 back.
  const { session, errorResponse } = await requireTeacherSession();
  if (errorResponse) return errorResponse;

  const teacherProfile = await db.teacherProfile.findUnique({
    where: { userId: session.userId },
    include: {
      classes: {
        include: { students: true, assignments: true },
      },
    },
  });

  if (!teacherProfile) {
    // Return zeros gracefully — profile may not exist yet
    return NextResponse.json(
      { success: true, message: "OK", data: { totalStudents: 0, assignedClasses: [], averageCompletion: 0, activeAssignments: 0 } },
      { status: 200 }
    );
  }

  const totalStudents     = teacherProfile.classes.reduce((s, c) => s + c.students.length, 0);
  const activeAssignments = teacherProfile.classes.reduce((s, c) => s + c.assignments.filter(a => a.status === "ACTIVE").length, 0);

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: {
        id:                 teacherProfile.id,
        schoolName:         teacherProfile.schoolName,
        assignedClasses:    teacherProfile.classes.map(c => ({ id: c.id, className: c.className, grade: c.grade, studentCount: c.students.length })),
        totalStudents,
        activeAssignments,
        averageCompletion: 0, // would be computed from quiz attempts in a full implementation
      },
    },
    { status: 200 }
  );
}
