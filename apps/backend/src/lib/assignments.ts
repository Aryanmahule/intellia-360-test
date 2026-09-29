/**
 * Shared assignment vocabulary for the teacher and student consoles.
 *
 * Both sides read the same `Assignment` rows but describe them differently:
 * a teacher sees one card per assignment with a class-wide submission count,
 * a student sees their own state for that assignment. Keeping the mapping in
 * one place is what stops the two screens drifting apart — the whole point of
 * linking them.
 */
import type { Assignment, AssignmentSubmission } from "@prisma/client";

/** What a teacher's board column is called. */
export type TeacherBoardStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Overdue";

/** What a single student sees for an assignment. */
export type StudentAssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE";

export const TEACHER_BOARD_COLUMNS: TeacherBoardStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Overdue",
];

export const ASSIGNMENT_TYPES = [
  "Homework",
  "Worksheet",
  "Quiz",
  "Practice",
  "Project",
] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

/**
 * Board column for a teacher.
 *
 * `AssignmentStatus` in the database has three values (DRAFT, ACTIVE,
 * COMPLETED); "Overdue" is not stored because it is a function of the clock,
 * so it is derived here rather than written to a row that would then go stale.
 */
export function teacherBoardStatus(
  assignment: Pick<Assignment, "status" | "dueDate">,
  now: Date = new Date()
): TeacherBoardStatus {
  if (assignment.status === "COMPLETED") return "Completed";
  if (assignment.status === "DRAFT") return "Not Started";
  return assignment.dueDate.getTime() < now.getTime() ? "Overdue" : "In Progress";
}

/** Inverse of `teacherBoardStatus` for the columns that map to a stored value. */
export function boardStatusToDbStatus(
  column: TeacherBoardStatus
): "DRAFT" | "ACTIVE" | "COMPLETED" {
  if (column === "Not Started") return "DRAFT";
  if (column === "Completed") return "COMPLETED";
  // "Overdue" is derived from the due date, so dragging a card there leaves the
  // row ACTIVE — the date is what makes it overdue, not the column.
  return "ACTIVE";
}

/**
 * One student's state for an assignment.
 *
 * Deliberately per-student rather than the assignment's own status: an
 * assignment is "Completed" for the class when the teacher closes it, but
 * "COMPLETED" for Maya only once Maya has submitted.
 */
export function studentAssignmentStatus(
  assignment: Pick<Assignment, "dueDate">,
  submission: Pick<AssignmentSubmission, "submittedAt"> | null | undefined,
  now: Date = new Date()
): StudentAssignmentStatus {
  if (submission?.submittedAt) return "COMPLETED";
  if (submission) return "IN_PROGRESS";
  return assignment.dueDate.getTime() < now.getTime() ? "OVERDUE" : "PENDING";
}
