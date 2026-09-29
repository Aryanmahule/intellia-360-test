"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReusableTable, {
  ColumnDef,
} from "@/components/admin/ReusableTable";
import { fetchSchools, createSchool, updateSchool, deleteSchool, SchoolRow } from "@/data/admin/tables";
import {
  Building2,
  CheckCircle2,
  Clock,
} from "@/components/admin/icons";

/* ─── Onboard School Modal ─────────────────────────────────────────────────── */
function OnboardSchoolModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", location: "", adminName: "", adminEmail: "", plan: "Basic" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const PLANS = ["Basic", "Standard", "Premium", "Enterprise"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.adminEmail.trim()) { setError("School name and admin email are required."); return; }
    setSaving(true); setError("");
    const result = await createSchool(form);
    setSaving(false);
    if (result.success) { setSaved(true); onCreated(); }
    else { setError(result.message); }
  }

  const f = (k: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>
      <input type={type} style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }}
        placeholder={placeholder} value={form[k]}
        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:500, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        {!saved ? (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Onboard New School</h2>
              <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>
            {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {f("name",       "School Name *",         "text",  "e.g. Greenwood High School")}
              {f("location",   "Location",              "text",  "City, State")}
              {f("adminName",  "School Admin Name",     "text",  "Full name")}
              {f("adminEmail", "School Admin Email *",  "email", "admin@school.com")}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Subscription Plan</label>
                <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                  style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving ? .6 : 1 }}>
                  {saving ? "Saving…" : "Onboard School"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏫</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#1e1b4b", marginBottom:8 }}>School Onboarded!</h2>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}><strong>{form.name}</strong> has been added to the platform. The admin will receive setup instructions at <strong>{form.adminEmail}</strong>.</p>
            <button onClick={onClose} style={{ padding:"10px 24px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:700, cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit School Modal ────────────────────────────────────────────────────── */
function EditSchoolModal({ school, onClose, onSaved }: { school: SchoolRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: school.name,
    location: school.location === "—" ? "" : school.location,
    plan: school.plan,
    status: school.status.toUpperCase() as "ACTIVE" | "PENDING" | "INACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const PLANS = ["Basic", "Standard", "Premium", "Enterprise"];
  const STATUSES: Array<"ACTIVE" | "PENDING" | "INACTIVE"> = ["ACTIVE", "PENDING", "INACTIVE"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("School name is required."); return; }
    setSaving(true); setError("");
    const result = await updateSchool(school.id, form);
    setSaving(false);
    if (result.success) { onSaved(); onClose(); }
    else { setError(result.message); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:460, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Edit School</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>
        {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>School Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Location</label>
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Subscription Plan</label>
            <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as typeof form.status }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
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

export default function AdminSchoolsPage() {
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRow | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteSchool = async (school: SchoolRow) => {
    if (!window.confirm(`Delete ${school.name}? This cannot be undone.`)) return;
    const result = await deleteSchool(school.id);
    if (result.success) loadSchools();
    else window.alert(result.message);
  };

  const loadSchools = () => {
    setLoading(true);
    fetchSchools().then((rows) => { setSchools(rows); setLoading(false); });
  };

  useEffect(() => { loadSchools(); }, []);

  // Quick Action links arrive as /admin/schools?new=1 and open this page's own onboard modal.
  useEffect(() => {
    // One-time deep-link handoff on mount, not a render-driven update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowOnboardModal(true);
  }, []);

  /* =========================================
     Dynamic School Statistics
  ========================================= */

  const schoolStats = useMemo(() => {
    const totalSchools = schools.length;

    const activeSchools = schools.filter(
      (school) => school.status === "Active"
    ).length;

    const pendingSchools = schools.filter(
      (school) => school.status === "Pending"
    ).length;

    const inactiveSchools = schools.filter(
      (school) => school.status === "Inactive"
    ).length;

    const totalTeachers = schools.reduce(
      (total, school) =>
        total + Number(school.teachersCount || 0),
      0
    );

    const totalStudents = schools.reduce(
      (total, school) =>
        total + Number(school.studentsCount || 0),
      0
    );

    const activeRate =
      totalSchools > 0
        ? Math.round((activeSchools / totalSchools) * 100)
        : 0;

    return {
      totalSchools,
      activeSchools,
      pendingSchools,
      inactiveSchools,
      totalTeachers,
      totalStudents,
      activeRate,
    };
  }, [schools]);

  /* =========================================
     Schools Table Columns
  ========================================= */

  const schoolColumns: ColumnDef<SchoolRow>[] = [
    {
      header: "School Name",
      accessor: (row: SchoolRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <div className="font-semibold text-slate-900">
              {row.name}
            </div>

            <div className="text-xs text-slate-500">
              ID: {row.code}
            </div>
          </div>
        </div>
      ),
    },

    {
      header: "Location",
      accessor: "location",
    },

    {
      header: "Teachers",
      accessor: (row: SchoolRow) => (
        <span className="font-medium text-slate-700">
          {Number(row.teachersCount || 0).toLocaleString()}
        </span>
      ),
    },

    {
      header: "Students",
      accessor: (row: SchoolRow) => (
        <span className="font-medium text-slate-700">
          {Number(row.studentsCount || 0).toLocaleString()}
        </span>
      ),
    },

    {
      header: "Subscription Plan",
      accessor: (row: SchoolRow) => (
        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          {row.plan}
        </span>
      ),
    },

    {
      header: "Status",
      accessor: (row: SchoolRow) => {
        const statusClass =
          row.status === "Active"
            ? "bg-emerald-50 text-emerald-700"
            : row.status === "Pending"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-600";

        return (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
          >
            {row.status}
          </span>
        );
      },
    },
  ];

  const schoolRowActions = [
    { label: "Edit", onClick: (row: SchoolRow) => setEditingSchool(row) },
    { label: "Delete", danger: true, onClick: handleDeleteSchool },
  ];

  /* =========================================
     Page
  ========================================= */

  return (
    <AdminLayout>
      {showOnboardModal && (
        <OnboardSchoolModal
          onClose={() => setShowOnboardModal(false)}
          onCreated={loadSchools}
        />
      )}
      {editingSchool && (
        <EditSchoolModal
          school={editingSchool}
          onClose={() => setEditingSchool(null)}
          onSaved={loadSchools}
        />
      )}
      <div className="admin-schools-page">

        {/* =====================================
            Page Header
        ===================================== */}

        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumb">
              Admin / Schools
            </div>

            <h1 className="admin-page-title">
              Schools
            </h1>

            <p className="admin-page-subtitle">
              Manage registered schools, subscriptions and
              verification status.
            </p>
          </div>
        </div>

        {/* =====================================
            Statistics Cards
        ===================================== */}

        <div className="school-stats-grid">

          {/* Total Schools */}
          <div className="school-stat-card">
            <div className="school-stat-icon orange">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Total Schools</span>
              <strong>{schoolStats.totalSchools.toLocaleString()}</strong>
              <small>Registered institutions</small>
            </div>
          </div>

          {/* Active Schools */}
          <div className="school-stat-card">
            <div className="school-stat-icon green">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Active Schools</span>
              <strong>{schoolStats.activeSchools.toLocaleString()}</strong>
              <small className="success-text">Currently active</small>
            </div>
          </div>

          {/* Pending Verification */}
          <div className="school-stat-card">
            <div className="school-stat-icon amber">
              <Clock className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Pending Verification</span>
              <strong>{schoolStats.pendingSchools.toLocaleString()}</strong>
              <small>Needs review</small>
            </div>
          </div>

          {/* Total Students */}
          <div className="school-stat-card">
            <div className="school-stat-icon blue">
              <span className="text-xl">🎓</span>
            </div>

            <div className="school-stat-content">
              <span>Total Students</span>
              <strong>{schoolStats.totalStudents.toLocaleString()}</strong>
              <small>Across all schools</small>
            </div>
          </div>

          {/* Teachers */}
          <div className="school-stat-card">
            <div className="school-stat-icon purple">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Total Teachers</span>
              <strong>{schoolStats.totalTeachers.toLocaleString()}</strong>
              <small>Across registered schools</small>
            </div>
          </div>

          {/* Inactive */}
          <div className="school-stat-card">
            <div className="school-stat-icon slate">
              <Clock className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Inactive Schools</span>
              <strong>{schoolStats.inactiveSchools.toLocaleString()}</strong>
              <small>Currently inactive</small>
            </div>
          </div>

          {/* Active Rate */}
          <div className="school-stat-card">
            <div className="school-stat-icon green">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="school-stat-content">
              <span>Active Rate</span>
              <strong className="success-text">{schoolStats.activeRate}%</strong>
              <small>School activation rate</small>
            </div>
          </div>
        </div>

        {/* =====================================
            Schools Directory
        ===================================== */}

        <ReusableTable
          title="Registered Schools Directory"
          subtitle={loading ? "Loading schools…" : "Manage and view operational status for all onboarded institutions."}
          data={schools}
          columns={schoolColumns}
          searchPlaceholder="Search school by name, code or city..."
          primaryActionLabel="Onboard New School"
          onPrimaryAction={() => setShowOnboardModal(true)}
          rowActions={schoolRowActions}
        />

      </div>
    </AdminLayout>
  );
}