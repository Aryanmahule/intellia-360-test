import { apiFetch } from "@/lib/api";
/* ============================================================
   TEACHER ASSIGNMENT DATA

   Backed by /api/teacher/assignments, which writes the same rows the
   student console reads from /api/student/assignments. The board used to
   keep its own copy in localStorage, so anything a teacher created was
   invisible to students and vanished on another device.

   Reads resolve rather than reject (the board has no error boundary) and
   send `cache: "no-store"`, because the list is re-fetched immediately
   after every create, edit and delete.
============================================================ */

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string | null;
  classId: string;
  className: string;
  lessonId: string | null;
  type: string;
  dueDate: string;
  assignedDate: string;
  status: "Not Started" | "In Progress" | "Completed" | "Overdue";
  points: number | null;
  totalQuestions: number | null;
  submitted: number;
  total: number;
}

export interface TeacherClass {
  id: string;
  className: string;
  grade: string;
  studentCount: number;
}

type MutationResult = { success: boolean; message: string };

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

/** Assignments across the teacher's own classes. Never rejects. */
export async function fetchAssignments(): Promise<TeacherAssignment[]> {
  try {
    const res = await apiFetch("/api/teacher/assignments", { cache: "no-store" });
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      console.error("[teacher] load assignments failed:", res.status, json?.message);
      return [];
    }
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error("[teacher] load assignments request failed:", err);
    return [];
  }
}

/** The teacher's real classes — the ids assignments are created against. */
export async function fetchClasses(): Promise<TeacherClass[]> {
  try {
    const res = await apiFetch("/api/teacher/me", { cache: "no-store" });
    const json = await readJson(res);
    if (!res.ok || !json?.success) return [];
    return Array.isArray(json.data?.assignedClasses) ? json.data.assignedClasses : [];
  } catch (err) {
    console.error("[teacher] load classes request failed:", err);
    return [];
  }
}

async function mutate(
  url: string,
  init: RequestInit,
  fallback: string
): Promise<MutationResult> {
  try {
    const res = await apiFetch(url, init);
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { success: false, message: json?.message ?? `${fallback} (${res.status})` };
    }
    return { success: true, message: json.message ?? "Done." };
  } catch (err) {
    console.error(`[teacher] ${fallback}:`, err);
    return { success: false, message: fallback };
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function createAssignment(input: {
  title: string;
  classId: string;
  type: string;
  dueDate: string;
  description?: string;
  lessonId?: string;
  points?: number;
  totalQuestions?: number;
}): Promise<MutationResult> {
  return mutate(
    "/api/teacher/assignments",
    jsonInit("POST", input),
    "Failed to create the assignment."
  );
}

export function updateAssignment(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    type: string;
    dueDate: string;
    status: TeacherAssignment["status"];
    points: number | null;
    totalQuestions: number | null;
  }>
): Promise<MutationResult> {
  return mutate(
    `/api/teacher/assignments/${id}`,
    jsonInit("PATCH", input),
    "Failed to update the assignment."
  );
}

export function deleteAssignment(id: string): Promise<MutationResult> {
  return mutate(
    `/api/teacher/assignments/${id}`,
    { method: "DELETE" },
    "Failed to delete the assignment."
  );
}

/** Due dates arrive as ISO strings; the board shows them the short way. */
export function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No due date";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
