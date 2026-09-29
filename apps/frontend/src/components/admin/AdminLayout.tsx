"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "./AdminSidebar";
import AdminNavbar from "./AdminNavbar";
import "@/styles/admin.css";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const DESKTOP_QUERY = "(min-width: 1024px)";

export default function AdminLayout({ children }: AdminLayoutProps) {
  // Mobile: the sidebar is a drawer. Desktop: it collapses to an icon rail.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      setIsDesktop(mql.matches);
      if (mql.matches) setIsDrawerOpen(false);
    };

    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isDesktop) setIsCollapsed((prev) => !prev);
    else setIsDrawerOpen((prev) => !prev);
  }, [isDesktop]);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDrawerOpen]);

  return (
    <div className={`admin-shell${isDesktop && isCollapsed ? " sidebar-collapsed" : ""}`}>
      <AdminSidebar
        isOpen={isDrawerOpen}
        isCollapsed={isDesktop && isCollapsed}
        onClose={closeDrawer}
      />

      <div className="admin-main-wrapper">
        <AdminNavbar onToggleSidebar={toggleSidebar} />

        <main className="admin-content-body">
          {children}

          <footer className="admin-footer">
            <span>© {new Date().getFullYear()} Intellia360. All rights reserved.</span>
            <nav className="admin-footer-links">
              <Link href="/admin/settings">Settings</Link>
              <Link href="/admin/reports">Reports</Link>
              <Link href="/admin/profile">My Profile</Link>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}
