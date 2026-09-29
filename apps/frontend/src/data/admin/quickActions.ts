// src/data/admin/quickActions.ts

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  /** Visual tone token — resolved to real colours in admin.css. */
  tone: string;
  link: string;
}

/* ============================================================
   ADMIN QUICK ACTIONS

   Navigation shortcuts into the Admin module. Every link resolves
   to a real page; the `?new=1` links open that page's own create
   modal, so the tile performs the action it advertises.
============================================================ */

export const quickActionCards: QuickAction[] = [
  { id: "add_course", label: "New Course", icon: "BookPlus", tone: "violet", link: "/admin/courses?new=1" },
  { id: "add_school", label: "Onboard School", icon: "Building2", tone: "amber", link: "/admin/schools?new=1" },
  { id: "add_content", label: "Add Content", icon: "FolderKanban", tone: "blue", link: "/admin/content?new=1" },
  { id: "manage_students", label: "Manage Students", icon: "Users", tone: "emerald", link: "/admin/students" },
  { id: "manage_teachers", label: "Manage Teachers", icon: "GraduationCap", tone: "cyan", link: "/admin/teachers" },
  { id: "payments", label: "Payments", icon: "CreditCard", tone: "rose", link: "/admin/payments" },
  { id: "reports", label: "Export Reports", icon: "FileText", tone: "orange", link: "/admin/reports" },
  { id: "settings", label: "System Settings", icon: "Settings", tone: "slate", link: "/admin/settings" },
];
