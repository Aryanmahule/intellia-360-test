import { apiFetch } from "@/lib/api";
/* ============================================================
   ADMIN TABLE DATA
   Backed by real DB-backed Admin APIs.
============================================================ */

/* ------------------------------------------------------------
   Request plumbing

   Every table page loads with the same shape:

     fetchX().then((rows) => { setRows(rows); setLoading(false); });

   — with no `.catch()`. So anything that made the request *reject*
   (a 500 that returns an HTML error page, so `res.json()` throws on
   "<!DOCTYPE", or the network dropping) left the promise rejected,
   `setLoading(false)` never ran, and the screen sat on "Loading…"
   for good. Reads therefore resolve here rather than reject, and
   report the reason to the console instead of vanishing.

   `cache: "no-store"` matches useAdminDashboard: these lists are
   re-fetched right after a create/edit/delete, and must never come
   back from the HTTP cache without the row that was just written.
------------------------------------------------------------ */

/** Reads a list endpoint. Resolves to [] on any failure — never rejects. */
export async function getRows<T>(url: string, label: string): Promise<T[]> {
  try {
    const res = await apiFetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      console.error(
        `[admin] ${label} failed (${res.status}):`,
        json?.message ?? res.statusText
      );
      return [];
    }
    return Array.isArray(json.data) ? (json.data as T[]) : [];
  } catch (err) {
    console.error(`[admin] ${label} request failed:`, err);
    return [];
  }
}

/** Sends a mutation. Always resolves to a result the caller can show. */
async function sendMutation(
  url: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await apiFetch(url, init);
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      return { success: false, message: json?.message ?? `${fallbackMessage} (${res.status})` };
    }
    return { success: true, message: json.message ?? "Done." };
  } catch (err) {
    console.error(`[admin] ${fallbackMessage}:`, err);
    return { success: false, message: fallbackMessage };
  }
}

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

interface ApiSchool {
  id: string; name: string; code: string; location: string | null;
  teachersCount: number; studentsCount: number; plan: string; status: string;
}
interface ApiUser {
  id: string; name: string; email: string; emailVerified: boolean;
  school: string | null; subject: string | null; classesCount: number | null;
  grade: string | null; xpPoints: number | null; learningGems: number | null;
  lastActiveDate: string | null;
}
interface ApiCourse {
  id: string; title: string; subject: string | null; grade: string;
  lessonsCount: number; enrolledStudents: number; rating: number; status: string;
}
interface ApiPayment {
  id: string; transactionId: string; payerName: string; schoolOrUser: string | null;
  amount: number; date: string; method: string; status: string;
}

/* ============================================================
   SCHOOL
============================================================ */

export interface SchoolRow {
  id: string;
  name: string;
  code: string;
  location: string;
  teachersCount: number;
  studentsCount: number;
  plan: string;
  status: "Active" | "Pending" | "Inactive";
}

function titleCaseStatus(status: string): "Active" | "Pending" | "Inactive" {
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING") return "Pending";
  return "Inactive";
}

export async function fetchSchools(): Promise<SchoolRow[]> {
  const rows = await getRows<ApiSchool>("/api/admin/schools", "load schools");
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    location: s.location ?? "—",
    teachersCount: s.teachersCount ?? 0,
    studentsCount: s.studentsCount ?? 0,
    plan: s.plan,
    status: titleCaseStatus(s.status),
  }));
}

export async function createSchool(input: {
  name: string;
  location?: string;
  adminName?: string;
  adminEmail: string;
  plan?: string;
}): Promise<{ success: boolean; message: string }> {
  return sendMutation("/api/admin/schools", jsonBody("POST", input), "Failed to onboard school.");
}

export async function updateSchool(
  id: string,
  input: Partial<{ name: string; location: string; adminName: string; adminEmail: string; plan: string; status: "ACTIVE" | "PENDING" | "INACTIVE" }>
): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/schools/${id}`, jsonBody("PATCH", input), "Failed to update school.");
}

export async function deleteSchool(id: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/schools/${id}`, { method: "DELETE" }, "Failed to delete school.");
}

/* ============================================================
   TEACHER
============================================================ */

export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  school: string;
  subject: string;
  classesCount: number;
  status: "Active" | "Pending" | "Suspended";
}

export async function fetchTeachers(): Promise<TeacherRow[]> {
  const rows = await getRows<ApiUser>("/api/admin/users?role=TEACHER&limit=100", "load teachers");
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    school: u.school ?? "—",
    subject: u.subject ?? "—",
    classesCount: u.classesCount ?? 0,
    status: u.emailVerified ? "Active" as const : "Pending" as const,
  }));
}

/* ============================================================
   USER (shared Teacher/Student account actions)
============================================================ */

export async function updateUserName(id: string, name: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/users/${id}`, jsonBody("PATCH", { name }), "Failed to update account.");
}

export async function deleteUser(id: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/users/${id}`, { method: "DELETE" }, "Failed to delete account.");
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<{ success: boolean; message: string }> {
  return sendMutation("/api/admin/users", jsonBody("POST", input), "Failed to create account.");
}

export async function changeUserRole(id: string, role: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/users/${id}/role`, jsonBody("PATCH", { role }), "Failed to change role.");
}

export async function restoreUser(id: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/users/${id}`, jsonBody("PATCH", { restore: true }), "Failed to restore account.");
}

/** Only succeeds for an account that is already deactivated. */
export async function deleteUserPermanently(id: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/users/${id}?permanent=true`, { method: "DELETE" }, "Failed to delete account permanently.");
}

/* ============================================================
   STUDENT
============================================================ */

export interface StudentRow {
  id: string;
  name: string;
  grade: string;
  school: string;
  xpPoints: number;
  gems: number;
  lastActive: string;
  status: "Active" | "Inactive";
}

export async function fetchStudents(): Promise<StudentRow[]> {
  const rows = await getRows<ApiUser>("/api/admin/users?role=STUDENT&limit=100", "load students");
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return rows.map((u) => {
    const lastActiveDate = u.lastActiveDate ? new Date(u.lastActiveDate) : null;
    const isActive = !!lastActiveDate && Date.now() - lastActiveDate.getTime() < THIRTY_DAYS_MS;
    return {
      id: u.id,
      name: u.name,
      grade: u.grade ?? "—",
      school: u.school ?? "—",
      xpPoints: u.xpPoints ?? 0,
      gems: u.learningGems ?? 0,
      lastActive: lastActiveDate ? lastActiveDate.toLocaleDateString() : "—",
      status: (isActive ? "Active" : "Inactive") as "Active" | "Inactive",
    };
  });
}

/* ============================================================
   COURSE
============================================================ */

export interface CourseRow {
  id: string;
  title: string;
  subject: string;
  grade: string;
  lessonsCount: number;
  enrolledStudents: number;
  rating: number;
  status: "Published" | "Draft";
}

export async function fetchCourses(): Promise<CourseRow[]> {
  const rows = await getRows<ApiCourse>("/api/admin/courses", "load courses");
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject ?? "—",
    grade: c.grade,
    lessonsCount: c.lessonsCount ?? 0,
    enrolledStudents: c.enrolledStudents ?? 0,
    rating: c.rating ?? 0,
    status: (c.status === "PUBLISHED" ? "Published" : "Draft") as "Published" | "Draft",
  }));
}

export async function createCourse(input: {
  title: string;
  subject?: string;
  grade: string;
  description?: string;
}): Promise<{ success: boolean; message: string }> {
  return sendMutation("/api/admin/courses", jsonBody("POST", input), "Failed to create course.");
}

export async function updateCourse(
  id: string,
  input: Partial<{ title: string; subject: string; grade: string; description: string; rating: number; status: "PUBLISHED" | "DRAFT" }>
): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/courses/${id}`, jsonBody("PATCH", input), "Failed to update course.");
}

export async function deleteCourse(id: string): Promise<{ success: boolean; message: string }> {
  return sendMutation(`/api/admin/courses/${id}`, { method: "DELETE" }, "Failed to delete course.");
}

/* ============================================================
   PAYMENT
============================================================ */

export interface PaymentRow {
  id: string;
  transactionId: string;
  payerName: string;
  schoolOrUser: string;
  amount: string;
  date: string;
  method: string;
  status: "Completed" | "Pending" | "Refunded";
}

export async function fetchPayments(): Promise<PaymentRow[]> {
  const rows = await getRows<ApiPayment>("/api/admin/payments", "load payments");
  return rows.map((p) => ({
    id: p.id,
    transactionId: p.transactionId,
    payerName: p.payerName,
    schoolOrUser: p.schoolOrUser ?? "—",
    amount: String(p.amount),
    date: new Date(p.date).toLocaleDateString(),
    method: p.method,
    status: (p.status === "COMPLETED" ? "Completed" : p.status === "REFUNDED" ? "Refunded" : "Pending") as
      | "Completed"
      | "Pending"
      | "Refunded",
  }));
}

export async function createPayment(input: {
  payerName: string;
  schoolOrUser?: string;
  amount: number;
  method?: string;
  status?: "COMPLETED" | "PENDING" | "REFUNDED";
}): Promise<{ success: boolean; message: string }> {
  return sendMutation("/api/admin/payments", jsonBody("POST", input), "Failed to generate invoice.");
}
