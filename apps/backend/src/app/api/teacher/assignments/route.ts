/**
 * GET  /api/teacher/assignments — assignments across the teacher's own classes
 * POST /api/teacher/assignments — create one and assign it to a class
 *
 * Writes here are what the student console reads back from
 * GET /api/student/assignments, so the two screens share one source of truth
 * instead of the browser-local copy the teacher board used to keep.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherSession } from "@/lib/teacher/require-teacher-session";
import { db } from "@/lib/db";
import {
  teacherBoardStatus,
  boardStatusToDbStatus,
  ASSIGNMENT_TYPES,
  TEACHER_BOARD_COLUMNS,
  type TeacherBoardStatus,
} from "@/lib/assignments";
import type { AuthResponse } from "@intellia360/shared/types/auth";

export interface TeacherAssignmentRow {
  id: string;
  title: string;
  description: string | null;
  classId: string;
  className: string;
  lessonId: string | null;
  type: string;
  /** ISO date — the console formats it for display. */
  dueDate: string;
  assignedDate: string;
  status: TeacherBoardStatus;
  points: number | null;
  totalQuestions: number | null;
  /** Students who have submitted, out of the class roster. */
  submitted: number;
  total: number;
}

const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  classId: z.string().trim().min(1, "Pick a class"),
  type: z.enum(ASSIGNMENT_TYPES).default("Homework"),
  dueDate: z.coerce.date({ message: "Enter a valid due date" }),
  description: z.string().trim().max(2000).optional(),
  lessonId: z.string().trim().max(200).optional(),
  points: z.coerce.number().int().min(0).max(1000).optional(),
  totalQuestions: z.coerce.number().int().min(0).max(500).optional(),
  status: z.enum(TEACHER_BOARD_COLUMNS as [TeacherBoardStatus, ...TeacherBoardStatus[]])
    .default("In Progress"),
});

export async function GET() {
  const { session, errorResponse } = await requireTeacherSession();
  if (errorResponse) return errorResponse;

  // A teacher with no classes has no assignments — return an empty board
  // rather than falling through to an unfiltered query.
  if (session.classIds.length === 0) {
    return NextResponse.json(
      { success: true, message: "OK", data: [] as TeacherAssignmentRow[] },
      { status: 200 }
    );
  }

  const assignments = await db.assignment.findMany({
    where: { classId: { in: session.classIds } },
    orderBy: { dueDate: "asc" },
    include: {
      class: { select: { className: true, _count: { select: { students: true } } } },
      // Counted rather than loaded: a class roster's worth of submission rows
      // per assignment would grow the payload for a number the card renders.
      _count: { select: { submissions: true } },
    },
  });

  const now = new Date();
  const data: TeacherAssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description ?? null,
    classId: a.classId,
    className: a.class.className,
    lessonId: a.lessonId ?? null,
    type: a.type ?? "Homework",
    dueDate: a.dueDate.toISOString(),
    assignedDate: a.assignedDate.toISOString(),
    status: teacherBoardStatus(a, now),
    points: a.points ?? null,
    totalQuestions: a.totalQuestions ?? null,
    submitted: a._count.submissions,
    total: a.class._count.students,
  }));

  return NextResponse.json({ success: true, message: "OK", data }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await requireTeacherSession();
  if (errorResponse) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const result = CreateAssignmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: result.error.issues[0]?.message ?? "Invalid assignment" },
      { status: 400 }
    );
  }

  const input = result.data;

  // The classId arrives from the browser, so it is checked against the classes
  // this teacher actually owns — otherwise any teacher could assign work to
  // another teacher's class by editing the request.
  if (!session.classIds.includes(input.classId)) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "That class does not belong to you." },
      { status: 403 }
    );
  }

  const created = await db.assignment.create({
    data: {
      title: input.title,
      classId: input.classId,
      lessonId: input.lessonId ?? null,
      dueDate: input.dueDate,
      status: boardStatusToDbStatus(input.status),
      description: input.description ?? null,
      type: input.type,
      points: input.points ?? null,
      totalQuestions: input.totalQuestions ?? null,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json(
    {
      success: true,
      message: `"${created.title}" assigned to the class.`,
      data: created,
    },
    { status: 201 }
  );
}
