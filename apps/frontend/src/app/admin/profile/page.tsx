"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalGrades: 0 });

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then(r => r.json())
      .then(j => { if (j.success) setStats({ totalUsers: j.data.totalUsers, totalGrades: j.data.totalGrades }); })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  return (
    <AdminLayout>
      <div className="admin-page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="admin-breadcrumb">Admin / Profile</div>
          <h1 className="admin-page-title">My Profile</h1>
          <p className="admin-page-subtitle">View and manage your administrator account.</p>
        </div>
      </div>

      <div className="admin-profile-grid">

        {/* Avatar card */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 24px", gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 900, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e1b4b" }}>{user?.name ?? "Platform Admin"}</div>
            <div style={{ fontSize: ".82rem", color: "#64748b", marginTop: 3 }}>{user?.email ?? ""}</div>
          </div>
          <div style={{ padding: "5px 14px", background: "rgba(249,115,22,.10)", border: "1px solid rgba(249,115,22,.25)", borderRadius: 999, fontSize: 12, fontWeight: 700, color: "#f97316" }}>
            {user?.role ?? "ADMIN"}
          </div>
          <div style={{ fontSize: ".75rem", color: user?.emailVerified ? "#10b981" : "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            {user?.emailVerified ? "✅ Email verified" : "⚠️ Email not verified"}
          </div>
        </div>

        {/* Info card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="admin-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: ".9rem", fontWeight: 700, color: "#1e1b4b", margin: "0 0 16px" }}>Account Information</h3>
            {[
              { label: "Full Name",  value: user?.name  ?? "—" },
              { label: "Email",      value: user?.email ?? "—" },
              { label: "Role",       value: user?.role  ?? "—" },
              { label: "Member Since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: ".85rem" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: "#1e1b4b", fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="admin-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: ".9rem", fontWeight: 700, color: "#1e1b4b", margin: "0 0 16px" }}>Platform Overview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "👥", label: "Total Users",  value: stats.totalUsers },
                { icon: "🎓", label: "Grade Levels", value: stats.totalGrades },
              ].map(s => (
                <div key={s.label} style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e1b4b" }}>{s.value}</div>
                    <div style={{ fontSize: ".72rem", color: "#9ca3af", fontWeight: 600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: ".9rem", fontWeight: 700, color: "#1e1b4b", margin: "0 0 12px" }}>Security</h3>
            <a href="/forgot-password" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: ".83rem", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
              🔑 Change Password
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
