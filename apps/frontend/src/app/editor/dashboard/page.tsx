"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface Stats {
  totalGrades: number;
  totalLessons: number;
  gradesWithNoLessons: string[];
}

const QUICK_ACTIONS = [
  { icon: "🎓", label: "Manage Grades",     href: "/editor/grades",     color: "#f97316" },
  { icon: "📝", label: "Edit Lessons",      href: "/editor/lessons",    color: "#7c3aed" },
  { icon: "🗂", label: "Curriculum JSON",   href: "/editor/curriculum", color: "#3b82f6" },
  { icon: "📚", label: "Courses",           href: "/editor/courses",    color: "#10b981" },
  { icon: "👁", label: "Preview Student",   href: "/student/dashboard", color: "#f59e0b" },
];

export default function EditorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/editor/stats")
      .then((r) => r.json())
      .then((j) => { if (j.success) setStats(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="ed-page">
      {/* Welcome banner */}
      <div className="ed-welcome-banner">
        <div className="ed-welcome-text">
          <h1 className="ed-welcome-title">
            {greeting}, {user?.name?.split(" ")[0] ?? "Editor"} 👋
          </h1>
          <p className="ed-welcome-sub">
            Manage grades, lessons, and curriculum content for the Intellia360 platform.
          </p>
        </div>
        <div className="ed-welcome-badge">
          <span>✏️</span>
          <span>Content Editor</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="ed-stat-grid">
        {[
          { icon: "🎓", label: "Grades",   value: loading ? "…" : stats?.totalGrades  ?? 0, color: "#f97316", href: "/editor/grades" },
          { icon: "📝", label: "Lessons",  value: loading ? "…" : stats?.totalLessons ?? 0, color: "#7c3aed", href: "/editor/lessons" },
          { icon: "⚠️", label: "Empty Grades", value: loading ? "…" : stats?.gradesWithNoLessons?.length ?? 0, color: "#ef4444", href: "/editor/grades" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="ed-stat-card" style={{ textDecoration: "none" }}>
            <div className="ed-stat-icon" style={{ background: `${s.color}18` }}>
              <span>{s.icon}</span>
            </div>
            <div className="ed-stat-value">{String(s.value)}</div>
            <div className="ed-stat-label">{s.label}</div>
            <div className="ed-stat-arrow" style={{ color: s.color }}>→</div>
          </Link>
        ))}
      </div>

      {/* Two-column row */}
      <div className="ed-mid-row">
        {/* Quick actions */}
        <div className="ed-panel">
          <div className="ed-panel-header">
            <span className="ed-panel-title">⚡ Quick Actions</span>
          </div>
          <div className="ed-panel-body">
            <div className="ed-action-grid">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} className="ed-action-btn" style={{ textDecoration: "none" }}>
                  <div className="ed-action-icon" style={{ background: `${a.color}18`, color: a.color }}>
                    {a.icon}
                  </div>
                  <span className="ed-action-label">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Grades needing content */}
        <div className="ed-panel">
          <div className="ed-panel-header">
            <span className="ed-panel-title">⚠️ Grades Needing Lessons</span>
            <Link href="/editor/grades" className="ed-panel-link">Fix →</Link>
          </div>
          <div className="ed-panel-body">
            {loading ? (
              <div className="ed-empty">Loading…</div>
            ) : (stats?.gradesWithNoLessons?.length ?? 0) === 0 ? (
              <div className="ed-success-msg">✅ All grades have lesson content</div>
            ) : (
              <div className="ed-warn-list">
                {stats!.gradesWithNoLessons.map((g) => (
                  <Link key={g} href={`/editor/lessons?grade=${g}`} className="ed-warn-item">
                    <span className="ed-warn-icon">📂</span>
                    <span>{g.replace("grade", "Grade ")}</span>
                    <span className="ed-warn-badge">0 lessons</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
