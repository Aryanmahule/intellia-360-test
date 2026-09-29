/**
 * PATCH  /api/teacher/assignments/[id] — update an assignment
 * DELETE /api/teacher/assignments/[id] — remove it (and its submissions)
 *
 * Both verify the assignment belongs to a class the caller owns before
 * touching it; an id in the URL is not proof of ownership.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherSession } from "@/lib/teacher/require-teacher-session";
import { db } from "@/lib/db";
import {
  boardStatusToDbStatus,
  ASSIGNMENT_TYPES,
  TEACHER_BOARD_COLUMNS,
  type TeacherBoardStatus,
} from "@/lib/assignments";
import type { AuthResponse } from "@intellia360/shared/types/auth";

type Params = { params: Promise<{ id: string }> };

const UpdateAssignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    type: z.enum(ASSIGNMENT_TYPES).optional(),
    dueDate: z.coerce.date().optional(),
    lessonId: z.string().trim().max(200).nullable().optional(),
    points: z.coerce.number().int().min(0).max(1000).nullable().optional(),
    totalQuestions: z.coerce.number().int().min(0).max(500).nullable().optional(),
    status: z
      .enum(TEACHER_BOARD_COLUMNS as [TeacherBoardStatus, ...TeacherBoardStatus[]])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** Loads the assignment only if it sits in one of the caller's classes. */
async function ownedAssignment(id: string, classIds: string[]) {
  if (classIds.length === 0) return null;
  return db.assignment.findFirst({
    where: { id, classId: { in: classIds } },
    select: { id: true, title: true },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireTeacherSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const existing = await ownedAssignment(id, session.classIds);
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Assignment not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  const result = UpdateAssignmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: result.error.issues[0]?.message ?? "Invalid update" },
      { status: 400 }
    );
  }

  const { status, ...rest } = result.data;

  await db.assignment.update({
    where: { id },
    data: {
      ...rest,
      ...(status ? { status: boardStatusToDbStatus(status) } : {}),
    },
  });

  return NextResponse.json(
    { success: true, message: "Assignment updated." },
    { status: 200 }
  );
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, errorResponse } = await requireTeacherSession();
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const existing = await ownedAssignment(id, session.classIds);
  if (!existing) {
    return NextResponse.json<AuthResponse>(
      { success: false, message: "Assignment not found" },
      { status: 404 }
    );
  }

  // Submissions cascade from the schema's onDelete: Cascade.
  await db.assignment.delete({ where: { id } });

  return NextResponse.json(
    { success: true, message: `"${existing.title}" deleted.` },
    { status: 200 }
  );
}
