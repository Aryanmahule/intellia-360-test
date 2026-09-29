"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { sidebarSections, MenuItem } from "@/data/admin/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  FolderKanban,
  TrendingUp,
  CreditCard,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
} from "@/components/admin/icons";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  FolderKanban,
  TrendingUp,
  CreditCard,
  FileText,
  Settings,
};

interface AdminSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

/** A nav row is active when its own path or one of its children matches. */
function isItemActive(item: MenuItem, pathname: string): boolean {
  const paths = [item.path, ...(item.children?.map((c) => c.path) ?? [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function AdminSidebar({ isOpen, isCollapsed, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  // Groups start expanded when they contain the current page.
  const initiallyExpanded = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const section of sidebarSections) {
      for (const item of section.items) {
        if (item.children?.length) open[item.id] = isItemActive(item, pathname);
      }
    }
    return open;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initiallyExpanded);

  const toggleGroup = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? initiallyExpanded[id]) }));

  const isGroupOpen = (id: string) => expanded[id] ?? initiallyExpanded[id] ?? false;

  return (
    <>
      {isOpen && (
        <div className="admin-sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`admin-sidebar${isOpen ? " is-open" : ""}${isCollapsed ? " is-collapsed" : ""}`}
        aria-label="Admin navigation"
      >
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="admin-sidebar-brand">
          <Link href="/admin/dashboard" className="admin-sidebar-brand-link" onClick={onClose}>
            <Image
              src="/assets/logo/intellia360-log.png"
              alt="Intellia360"
              width={140}
              height={40}
              priority
              className="admin-sidebar-logo-img"
            />
            <span className="admin-sidebar-brand-sub">Admin Module</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="admin-sidebar-close"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav className="admin-sidebar-nav">
          {sidebarSections.map((section) => (
            <div key={section.id} className="admin-nav-section">
              <span className="admin-nav-section-label">{section.label}</span>

              {section.items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const active = isItemActive(item, pathname);
                const hasChildren = Boolean(item.children?.length);
                const open = hasChildren && isGroupOpen(item.id);

                if (hasChildren) {
                  return (
                    <div key={item.id} className="admin-nav-group">
                      <button
                        type="button"
                        className={`admin-nav-item${active ? " active" : ""}`}
                        onClick={() => toggleGroup(item.id)}
                        aria-expanded={open}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="nav-icon" />
                        <span className="admin-nav-label">{item.label}</span>
                        <ChevronDown
                          className={`admin-nav-chevron${open ? " is-open" : ""}`}
                        />
                      </button>

                      {open && (
                        <div className="admin-nav-children">
                          {item.children?.map((child) => {
                            const childActive =
                              pathname === child.path || pathname.startsWith(`${child.path}/`);
                            return (
                              <Link
                                key={child.path}
                                href={child.path}
                                className={`admin-nav-child${childActive ? " active" : ""}`}
                                onClick={onClose}
                              >
                                <span className="admin-nav-child-dot" />
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`admin-nav-item${active ? " active" : ""}`}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="nav-icon" />
                    <span className="admin-nav-label">{item.label}</span>
                    {item.badge && <span className="admin-nav-badge">{item.badge.text}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Promo / shortcut card ─────────────────────────────────────── */}
        <Link href="/admin/analytics" className="admin-sidebar-promo" onClick={onClose}>
          <span className="admin-sidebar-promo-glow" aria-hidden="true" />
          <span className="admin-sidebar-promo-icon">
            <Sparkles className="w-5 h-5" />
          </span>
          <span className="admin-sidebar-promo-title">Make Learning Smarter Everyday</span>
          <span className="admin-sidebar-promo-cta">
            Explore analytics <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </aside>
    </>
  );
}
