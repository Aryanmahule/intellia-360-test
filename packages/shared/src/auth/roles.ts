/**
 * Single source of truth for role values.
 *
 * Every layer that names a role imports from here so the strings can never
 * drift apart:
 *
 *   • Prisma  — `enum Role` in prisma/schema.prisma (must stay in sync)
 *   • Types   — `UserRole` in src/types/auth.ts
 *   • Zod     — RegisterSchema.requestedRole
 *   • UI      — the intent picker on the register page
 *   • Routing — proxy.ts role guards and the post-login redirect
 *
 * Values are the SCREAMING_CASE Prisma enum members. Nothing in the app
 * should ever send or compare a lowercase / display-cased role string.
 */
import type { UserRole } from "../types/auth";

/** Every role the system knows about — mirrors the Prisma `Role` enum. */
export const ALL_ROLES = [
  "ADMIN",
  "STUDENT",
  "PARENT",
  "TEACHER",
  "SCHOOL",
  "EDITOR",
] as const satisfies readonly UserRole[];

/**
 * Roles a visitor may *request* at signup.
 *
 * ADMIN is deliberately absent: it can only be granted by an existing admin
 * via PATCH /api/admin/users/[userId]/role.
 */
export const REGISTRABLE_ROLES = [
  "STUDENT",
  "PARENT",
  "TEACHER",
  "SCHOOL",
  "EDITOR",
] as const satisfies readonly UserRole[];

export type RegistrableRole = (typeof REGISTRABLE_ROLES)[number];

/**
 * The role every new account is created with, regardless of the requested
 * role. An admin reviews `requestedRole` and upgrades the account.
 */
export const DEFAULT_ROLE = "STUDENT" as const satisfies UserRole;

/** Landing page for a role after login / verification. */
export function dashboardFor(role: UserRole): string {
  if (role === "TEACHER" || role === "SCHOOL") return "/teacher/dashboard";
  if (role === "EDITOR")                       return "/editor/dashboard";
  if (role === "ADMIN")                        return "/admin/dashboard";
  // STUDENT, PARENT and any unrecognised value land on the student dashboard.
  return "/student/dashboard";
}

/**
 * The protected areas of the app and the roles allowed into each.
 *
 * proxy.ts enforces these on every request. SessionGuard re-checks them in the
 * browser, because an open tab keeps rendering its old account after another
 * tab signs in as someone else or signs out — keeping one table means the two
 * checks can never disagree.
 */
export type AppArea = "student" | "teacher" | "editor" | "admin";

export const AREA_ROLES: Record<AppArea, readonly UserRole[]> = {
  student: ["STUDENT", "PARENT", "ADMIN"],
  teacher: ["TEACHER", "SCHOOL", "ADMIN"],
  editor:  ["EDITOR", "ADMIN"],
  admin:   ["ADMIN"],
};

/** The protected area a pathname belongs to, or null for a public route. */
export function areaForPath(pathname: string): AppArea | null {
  for (const area of Object.keys(AREA_ROLES) as AppArea[]) {
    const prefix = `/${area}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return area;
  }
  return null;
}

export function canAccessArea(role: UserRole, area: AppArea): boolean {
  return AREA_ROLES[area].includes(role);
}

/**
 * Where to send a user once they have signed in.
 *
 * `next` is set by proxy.ts when it bounced a signed-out visitor to /login. It
 * is honoured only when it is a same-site path inside an area the role may
 * open — anything else (another origin, a public page, another role's console)
 * falls back to the role's own dashboard.
 */
export function postLoginPath(role: UserRole, next?: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    const area = areaForPath(next.split(/[?#]/)[0]);
    if (area && canAccessArea(role, area)) return next;
  }
  return dashboardFor(role);
}
