/**
 * GET /api/student/assignments
 *
 * Everything the signed-in student's class has been set, with this student's
 * own state for each. The page at /student/assignments has always called this
 * route; it simply never existed, so the screen sat on a 404 that came back as
 * an HTML error document.
 *
 * Rows here are written by the teacher console through
 * POST /api/teacher/assignments — the two consoles read and write the same
 * `assignments` collection.
 */
import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/student/require-student-session";
import { db } from "@/lib/db";
import { studentAssignmentStatus, type StudentAssignmentStatus } from "@/lib/assignments";

export interface StudentAssignmentRow {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  teacherName: string | null;
  assignedAt: string;
  dueDate: string | null;
  status: StudentAssignmentStatus;
  totalQuestions: number;
  completedQuestions: number;
  points: number;
}

export async function GET() {
  const { session, errorResponse } = await requireStudentSession();
  if (errorResponse) return errorResponse;

  const profile = await db.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { classId: true },
  });

  // Not yet enrolled in a class: an empty list is the correct answer, and the
  // page renders its own "nothing assigned" state for it.
  if (!profile?.classId) {
    return NextResponse.json({ assignments: [] as StudentAssignmentRow[] }, { status: 200 });
  }

  const assignments = await db.assignment.findMany({
    where: {
      classId: profile.classId,
      // Drafts are the teacher's working copy and are not visible to students.
      status: { not: "DRAFT" },
    },
    orderBy: { dueDate: "asc" },
    include: {
      class: {
        select: {
          className: true,
          teacher: { select: { user: { select: { name: true } } } },
        },
      },
      // Only this student's submission — never the rest of the class's.
      submissions: {
        where: { studentId: session.userId },
        select: { submittedAt: true, scorePercent: true },
        take: 1,
      },
    },
  });

  const now = new Date();
  const rows: StudentAssignmentRow[] = assignments.map((a) => {
    const submission = a.submissions[0] ?? null;
    const status = studentAssignmentStatus(a, submission, now);
    const totalQuestions = a.totalQuestions ?? 0;

    return {
      id: a.id,
      title: a.title,
      description: a.description ?? null,
      subject: a.type ?? null,
      lessonId: a.lessonId ?? null,
      lessonTitle: a.class.className ?? null,
      teacherName: a.class.teacher?.user?.name ?? null,
      assignedAt: a.assignedDate.toISOString(),
      dueDate: a.dueDate.toISOString(),
      status,
      totalQuestions,
      // Without per-question tracking the honest read is all-or-nothing:
      // a submitted assignment counts as fully done, anything else as zero.
      completedQuestions: status === "COMPLETED" ? totalQuestions : 0,
      points: a.points ?? 0,
    };
  });

  return NextResponse.json({ assignments: rows }, { status: 200 });
}
