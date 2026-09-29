"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReusableTable, {
  ColumnDef,
} from "@/components/admin/ReusableTable";
import { fetchTeachers, updateUserName, deleteUser, TeacherRow } from "@/data/admin/tables";
import {
  GraduationCap,
  UserCheck,
  Clock,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

/** Random per-account temp password — never reused across teachers. */
function generateTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 10);
  return `Tg${random}!1`;
}

/* ─── Invite Teacher Modal ─────────────────────────────────────────────────── */
function InviteTeacherModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", school: "", subject: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword] = useState(generateTempPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSending(true); setError("");
    try {
      // Register the teacher account directly via the auth API
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: tempPassword,
          confirmPassword: tempPassword,
          requestedRole: "TEACHER",
          school: form.school || undefined,
          subject: form.subject || undefined,
          agreeToTerms: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Failed to send invitation.");
        return;
      }

      // register() always creates STUDENT — immediately upgrade to TEACHER
      // so the invited account has the correct role from the start.
      const userId = json.data?.userId;
      if (userId) {
        const roleRes = await apiFetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "TEACHER" }),
        });
        const roleJson = await roleRes.json();
        if (!roleJson.success) {
          setError(`Account created but role upgrade failed: ${roleJson.message ?? "unknown error"}`);
          return;
        }
      }

      setSent(true);
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const f = (k: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>
      <input
        type={type}
        className="table-search-input"
        style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }}
        placeholder={placeholder}
        value={form[k]}
        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
        required={k === "name" || k === "email"}
      />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:460, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        {!sent ? (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Invite Teacher</h2>
              <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              The teacher will receive a verification email and a temporary password. They should use <strong>Forgot Password</strong> to set their own.
            </p>
            {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {f("name",    "Full Name",    "text",  "e.g. Jane Smith")}
              {f("email",   "Email Address","email", "teacher@school.com")}
              {f("school",  "School (optional)", "text", "Oakridge Elementary")}
              {f("subject", "Subject (optional)", "text", "Mathematics")}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
                <button type="submit" disabled={sending} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:sending ? .6 : 1 }}>
                  {sending ? "Sending…" : "Send Invitation"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#1e1b4b", marginBottom:8 }}>Invitation Sent!</h2>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Teacher account created for <strong>{form.email}</strong> with the Teacher role. A verification email has been sent. Temporary password: <code style={{background:"#f1f5f9",padding:"2px 6px",borderRadius:4}}>{tempPassword}</code></p>
            <button onClick={onClose} style={{ padding:"10px 24px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:700, cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Teacher Modal ────────────────────────────────────────────────────── */
function EditTeacherModal({ teacher, onClose, onSaved }: { teacher: TeacherRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(teacher.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const result = await updateUserName(teacher.id, name.trim());
    setSaving(false);
    if (result.success) { onSaved(); onClose(); }
    else { setError(result.message); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:420, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Edit Teacher</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>
        {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
            <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving ? .6 : 1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTeachersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteTeacher = async (teacher: TeacherRow) => {
    if (!window.confirm(`Delete ${teacher.name}? This cannot be undone.`)) return;
    const result = await deleteUser(teacher.id);
    if (result.success) loadTeachers();
    else window.alert(result.message);
  };

  const loadTeachers = () => {
    setLoading(true);
    fetchTeachers().then((rows) => { setTeachers(rows); setLoading(false); });
  };

  useEffect(() => { loadTeachers(); }, []);

  // =========================
  // Dynamic Teacher Statistics
  // =========================
  const teacherStats = useMemo(() => {
    const totalTeachers = teachers.length;

    const activeTeachers = teachers.filter(
      (teacher) => teacher.status === "Active"
    ).length;

    const pendingTeachers = teachers.filter(
      (teacher) => teacher.status === "Pending"
    ).length;

    // Handles any status other than Active/Pending
    const inactiveTeachers = teachers.filter(
      (teacher) =>
        teacher.status !== "Active" &&
        teacher.status !== "Pending"
    ).length;

    const totalClasses = teachers.reduce(
      (total, teacher) =>
        total + Number(teacher.classesCount || 0),
      0
    );

    const activeRate =
      totalTeachers > 0
        ? Math.round((activeTeachers / totalTeachers) * 100)
        : 0;

    return {
      totalTeachers,
      activeTeachers,
      pendingTeachers,
      inactiveTeachers,
      totalClasses,
      activeRate,
    };
  }, [teachers]);

  // =========================
  // Table Columns
  // =========================
  const teacherColumns: ColumnDef<TeacherRow>[] = [
    {
      header: "Teacher Name",
      accessor: (row: TeacherRow) => (
        <div className="flex items-center gap-3">
          <div className="teacher-avatar">
            <GraduationCap className="w-5 h-5" />
          </div>

          <div>
            <div className="font-semibold text-slate-900">
              {row.name}
            </div>

            <div className="text-xs text-slate-500">
              {row.email}
            </div>
          </div>
        </div>
      ),
    },

    {
      header: "School",
      accessor: "school",
    },

    {
      header: "Subject",
      accessor: "subject",
    },

    {
      header: "Active Classes",
      accessor: (row: TeacherRow) => (
        <span className="font-semibold text-slate-700">
          {row.classesCount ?? 0}
        </span>
      ),
    },

    {
      header: "Status",
      accessor: (row: TeacherRow) => {
        const statusClass =
          row.status === "Active"
            ? "active"
            : row.status === "Pending"
              ? "pending"
              : "inactive";

        return (
          <span className={`status-badge ${statusClass}`}>
            <span className="status-dot" />
            {row.status}
          </span>
        );
      },
    },
  ];

  const teacherRowActions = [
    { label: "Edit", onClick: (row: TeacherRow) => setEditingTeacher(row) },
    { label: "Delete", danger: true, onClick: handleDeleteTeacher },
  ];

  return (
    <AdminLayout>
      {showInviteModal && (
        <InviteTeacherModal
          onClose={() => setShowInviteModal(false)}
          onCreated={loadTeachers}
        />
      )}
      {editingTeacher && (
        <EditTeacherModal
          teacher={editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onSaved={loadTeachers}
        />
      )}
      <div className="admin-teachers-page">

        {/* =========================
            Page Header
        ========================= */}
        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumb">
              Admin / Teachers
            </div>

            <h1 className="admin-page-title">
              Teachers
            </h1>

            <p className="admin-page-subtitle">
              Manage teacher accounts, subjects, classes and
              approval status across the platform.
            </p>
          </div>

          <button
            className="admin-primary-button"
            onClick={() => setShowInviteModal(true)}
          >
            + Invite Teacher
          </button>
        </div>

        {/* =========================
            Statistics
        ========================= */}
        <div className="teacher-stats-grid">

          {/* Total Teachers */}
          <div className="teacher-stat-card">
            <div className="teacher-stat-icon purple">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="teacher-stat-content">
              <span>Total Teachers</span>
              <strong>
                {teacherStats.totalTeachers.toLocaleString()}
              </strong>
              <small>
                Registered educators
              </small>
            </div>
          </div>

          {/* Active Teachers */}
          <div className="teacher-stat-card">
            <div className="teacher-stat-icon green">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="teacher-stat-content">
              <span>Active Educators</span>
              <strong>
                {teacherStats.activeTeachers.toLocaleString()}
              </strong>
              <small className="success-text">
                {teacherStats.activeRate}% active rate
              </small>
            </div>
          </div>

          {/* Pending Teachers */}
          <div className="teacher-stat-card">
            <div className="teacher-stat-icon orange">
              <Clock className="w-6 h-6" />
            </div>

            <div className="teacher-stat-content">
              <span>Awaiting Approval</span>
              <strong>
                {teacherStats.pendingTeachers.toLocaleString()}
              </strong>
              <small>
                Pending verification
              </small>
            </div>
          </div>

          {/* Classes */}
          <div className="teacher-stat-card">
            <div className="teacher-stat-icon blue">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="teacher-stat-content">
              <span>Active Classes</span>
              <strong>
                {teacherStats.totalClasses.toLocaleString()}
              </strong>
              <small>
                Across all teachers
              </small>
            </div>
          </div>
        </div>

        {/* =========================
            Teacher Directory
        ========================= */}
        <div className="teacher-directory-card">

          <ReusableTable
            title="Teacher Roster & Approvals"
            subtitle={loading ? "Loading teachers…" : "Manage educator accounts, class assignments, subject specializations and approval status."}
            data={teachers}
            columns={teacherColumns}
            searchPlaceholder="Search teacher by name, email or school..."
            primaryActionLabel="Invite Teacher"
            onPrimaryAction={() => setShowInviteModal(true)}
            rowActions={teacherRowActions}
          />

        </div>
      </div>
    </AdminLayout>
  );
}