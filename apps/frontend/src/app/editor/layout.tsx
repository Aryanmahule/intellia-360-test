"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SessionGuard from "@/components/auth/SessionGuard";
import { canAccessArea } from "@intellia360/shared/auth/roles";
import "@/styles/layout.css";
import "@/styles/editor.css";

const NAV = [
  { icon: "⊞",  label: "Dashboard",  href: "/editor/dashboard" },
  { icon: "🎓", label: "Grades",      href: "/editor/grades" },
  { icon: "📚", label: "Courses",     href: "/editor/courses" },
  { icon: "📝", label: "Lessons",     href: "/editor/lessons" },
  { icon: "🗂", label: "Curriculum",  href: "/editor/curriculum" },
];

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ED";

  // The student portal only admits STUDENT, PARENT and ADMIN. For an EDITOR
  // the proxy bounced this link straight back to the editor dashboard, so it
  // is only offered to roles that can actually open the preview.
  const canPreviewStudent = !!user && canAccessArea(user.role, "student");

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    // logout() leaves the page on success; it only returns when it failed.
    if (!(await logout())) setLoggingOut(false);
  }

  return (
    <SessionGuard area="editor">
      <div className="editor-shell">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={`editor-sidebar${collapsed ? " collapsed" : ""}`}>
          {/* Logo */}
          <div className="editor-sidebar-logo">
            <div className="editor-logo-badge">ED</div>
            {!collapsed && (
              <span className="editor-logo-text">
                intellia<span>360</span>
                <small>Editor</small>
              </span>
            )}
            <button
              className="editor-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? "▶" : "◀"}
            </button>
          </div>

          {/* Nav */}
          <nav className="editor-nav">
            {!collapsed && <span className="editor-nav-section">Content</span>}
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`editor-nav-item${active ? " active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="editor-nav-icon">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="editor-sidebar-footer">
            <div className="editor-user-avatar">{initials}</div>
            {!collapsed && (
              <div className="editor-user-info">
                <div className="editor-user-name">{user?.name ?? "Editor"}</div>
                <div className="editor-user-role">{user?.role ?? "EDITOR"}</div>
              </div>
            )}
            <button
              className="editor-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title={loggingOut ? "Logging out…" : "Logout"}
              aria-label="Logout"
            >
              →
            </button>
          </div>
        </aside>

        {/* ── Main area ────────────────────────────────────────────────────── */}
        <div className="editor-main-wrap">
          {/* Topbar */}
          <header className="editor-topbar">
            <div className="editor-topbar-left">
              <span className="editor-topbar-title">
                {NAV.find(
                  (n) => pathname === n.href || pathname.startsWith(n.href + "/")
                )?.label ?? "Editor"}
              </span>
              <span className="editor-topbar-sub">Content Management</span>
            </div>
            <div className="editor-topbar-right">
              {canPreviewStudent && (
                <Link href="/student/dashboard" className="editor-preview-btn">
                  👁 Preview as Student
                </Link>
              )}
              <div className="editor-topbar-avatar">{initials}</div>
            </div>
          </header>

          {/* Page content */}
          <main className="editor-main">{children}</main>
        </div>
      </div>
    </SessionGuard>
  );
}
