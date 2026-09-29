"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReusableTable, { ColumnDef } from "@/components/admin/ReusableTable";
import { fetchStudents, updateUserName, deleteUser, StudentRow } from "@/data/admin/tables";
import { Users, Award, Zap } from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

/** Random per-account temp password — never reused across students. */
function generateTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 10);
  return `Sg${random}!1`;
}

/* ─── Add Student Modal ─────────────────────────────────────────────────────── */
function AddStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", grade: "grade1", school: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword] = useState(generateTempPassword);

  const GRADES = ["grade1","grade2","grade3","grade4","grade5","grade6","grade7","grade8","grade9","grade10"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: tempPassword,
          confirmPassword: tempPassword,
          requestedRole: "STUDENT",
          grade: form.grade,
          school: form.school || undefined,
          agreeToTerms: true,
        }),
      });
      const json = await res.json();
      if (json.success) { setSaved(true); onCreated(); }
      else { setError(json.message ?? "Failed to add student."); }
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>
      <input type={type} style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }}
        placeholder={placeholder} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:460, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        {!saved ? (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Add Student</h2>
              <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>
            {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {f("name",   "Full Name *",   "text",  "e.g. Alex Rivera")}
              {f("email",  "Email Address *","email", "student@school.com")}
              {f("school", "School (optional)", "text", "Oakridge Elementary")}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Grade</label>
                <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                  style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
                  {GRADES.map(g => <option key={g} value={g}>{g.replace("grade","Grade ")}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving ? .6 : 1 }}>
                  {saving ? "Adding…" : "Add Student"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎓</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#1e1b4b", marginBottom:8 }}>Student Added!</h2>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Account created for <strong>{form.name}</strong>. A verification email has been sent to <strong>{form.email}</strong>. Temporary password: <code style={{background:"#f1f5f9",padding:"2px 6px",borderRadius:4}}>{tempPassword}</code></p>
            <button onClick={onClose} style={{ padding:"10px 24px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:700, cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Student Modal ────────────────────────────────────────────────────── */
function EditStudentModal({ student, onClose, onSaved }: { student: StudentRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(student.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const result = await updateUserName(student.id, name.trim());
    setSaving(false);
    if (result.success) { onSaved(); onClose(); }
    else { setError(result.message); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:420, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Edit Student</h2>
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

export default function AdminStudentsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteStudent = async (student: StudentRow) => {
    if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    const result = await deleteUser(student.id);
    if (result.success) loadStudents();
    else window.alert(result.message);
  };

  const loadStudents = () => {
    setLoading(true);
    fetchStudents().then((rows) => { setStudents(rows); setLoading(false); });
  };

  useEffect(() => { loadStudents(); }, []);

  /* =========================================
     Dynamic Student Statistics
  ========================================= */

  const studentStats = useMemo(() => {
    const totalStudents = students.length;

    const activeStudents = students.filter(
      (student) => student.status === "Active"
    ).length;

    const inactiveStudents = students.filter(
      (student) => student.status !== "Active"
    ).length;

    const totalXP = students.reduce(
      (total, student) =>
        total + Number(student.xpPoints || 0),
      0
    );

    const totalGems = students.reduce(
      (total, student) =>
        total + Number(student.gems || 0),
      0
    );

    const activeRate =
      totalStudents > 0
        ? Math.round((activeStudents / totalStudents) * 100)
        : 0;

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalXP,
      totalGems,
      activeRate,
    };
  }, [students]);

  /* =========================================
     Format Large Numbers
  ========================================= */

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const formatXP = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M XP`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K XP`;
    }

    return `${value.toLocaleString()} XP`;
  };

  /* =========================================
     Student Table Columns
  ========================================= */

  const studentColumns: ColumnDef<StudentRow>[] = [
    {
      header: "Student Name",
      accessor: (row: StudentRow) => (
        <div className="flex items-center gap-3">
          {/* Student Avatar */}
          <div className="student-avatar">
            <span>👦</span>
          </div>

          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">
              {row.name}
            </div>

            <div className="text-xs text-slate-500">
              {row.grade}
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
      header: "XP Earned",
      accessor: (row: StudentRow) => (
        <span className="student-xp-badge">
          <Zap className="h-3.5 w-3.5" />
          {Number(row.xpPoints || 0).toLocaleString()} XP
        </span>
      ),
    },

    {
      header: "Gems",
      accessor: (row: StudentRow) => (
        <span className="student-gems-badge">
          💎 {Number(row.gems || 0).toLocaleString()}
        </span>
      ),
    },

    {
      header: "Last Activity",
      accessor: "lastActive",
    },

    {
      header: "Status",
      accessor: (row: StudentRow) => {
        const statusClass =
          row.status === "Active"
            ? "active"
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

  const studentRowActions = [
    { label: "Edit", onClick: (row: StudentRow) => setEditingStudent(row) },
    { label: "Delete", danger: true, onClick: handleDeleteStudent },
  ];

  return (
    <AdminLayout>
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onCreated={loadStudents}
        />
      )}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={loadStudents}
        />
      )}
      <div className="admin-students-page">

        {/* =====================================
            Page Header
        ===================================== */}

        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumb">
              Admin / Students
            </div>

            <h1 className="admin-page-title">
              Students
            </h1>

            <p className="admin-page-subtitle">
              Monitor student engagement, XP, learning gems,
              activity and learning progress.
            </p>
          </div>

          <button className="admin-primary-button" onClick={() => setShowAddModal(true)}>
            + Add Student
          </button>
        </div>

        {/* =====================================
            Dynamic Statistics
        ===================================== */}

        <div className="student-stats-grid">

          {/* Total Students */}
          <div className="student-stat-card">
            <div className="student-stat-icon orange">
              <Users className="h-6 w-6" />
            </div>

            <div className="student-stat-content">
              <span>Total Learners</span>

              <strong>
                {formatNumber(
                  studentStats.totalStudents
                )}
              </strong>

              <small>
                Registered students
              </small>
            </div>
          </div>

          {/* Active Students */}
          <div className="student-stat-card">
            <div className="student-stat-icon green">
              <Users className="h-6 w-6" />
            </div>

            <div className="student-stat-content">
              <span>Active Learners</span>

              <strong>
                {formatNumber(
                  studentStats.activeStudents
                )}
              </strong>

              <small className="success-text">
                {studentStats.activeRate}% active
              </small>
            </div>
          </div>

          {/* Total XP */}
          <div className="student-stat-card">
            <div className="student-stat-icon amber">
              <Zap className="h-6 w-6" />
            </div>

            <div className="student-stat-content">
              <span>Total XP Awarded</span>

              <strong>
                {formatXP(studentStats.totalXP)}
              </strong>

              <small>
                Learning experience points
              </small>
            </div>
          </div>

          {/* Total Gems */}
          <div className="student-stat-card">
            <div className="student-stat-icon purple">
              <Award className="h-6 w-6" />
            </div>

            <div className="student-stat-content">
              <span>Total Gems</span>

              <strong>
                {formatNumber(
                  studentStats.totalGems
                )}
              </strong>

              <small>
                Learning rewards
              </small>
            </div>
          </div>
        </div>

        {/* =====================================
            Student Overview
        ===================================== */}

        <div className="student-overview-grid">

          {/* Engagement */}
          <div className="student-overview-card">

            <div className="student-overview-header">
              <div>
                <span>Student Engagement</span>

                <strong>
                  {studentStats.activeRate}%
                </strong>
              </div>

              <div className="overview-icon green">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="student-progress">
              <div
                className="student-progress-fill"
                style={{
                  width: `${studentStats.activeRate}%`,
                }}
              />
            </div>

            <p>
              {studentStats.activeStudents.toLocaleString()}{" "}
              active learners out of{" "}
              {studentStats.totalStudents.toLocaleString()}
            </p>
          </div>

          {/* Gamification */}
          <div className="student-overview-card">

            <div className="student-overview-header">
              <div>
                <span>Gamification Activity</span>

                <strong>
                  {formatXP(studentStats.totalXP)}
                </strong>
              </div>

              <div className="overview-icon amber">
                <Zap className="h-5 w-5" />
              </div>
            </div>

            <p className="student-overview-description">
              Total XP earned by students across the
              platform.
            </p>
          </div>

          {/* Rewards */}
          <div className="student-overview-card">

            <div className="student-overview-header">
              <div>
                <span>Learning Rewards</span>

                <strong>
                  {formatNumber(
                    studentStats.totalGems
                  )}
                </strong>
              </div>

              <div className="overview-icon purple">
                <Award className="h-5 w-5" />
              </div>
            </div>

            <p className="student-overview-description">
              Total learning gems earned by students.
            </p>
          </div>
        </div>

        {/* =====================================
            Student Directory
        ===================================== */}

        <div className="student-directory-card">
          <ReusableTable
            title="Student Directory & Gamification Records"
            subtitle={loading ? "Loading students…" : "Monitor student engagement, XP points, learning gems, activity and course progression."}
            data={students}
            columns={studentColumns}
            searchPlaceholder="Search student by name, grade or school..."
            primaryActionLabel="Add Student"
            onPrimaryAction={() => setShowAddModal(true)}
            rowActions={studentRowActions}
          />
        </div>
      </div>
    </AdminLayout>
  );
}