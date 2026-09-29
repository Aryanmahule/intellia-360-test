"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReusableTable, { ColumnDef } from "@/components/admin/ReusableTable";
import { fetchCourses, createCourse, updateCourse, deleteCourse, CourseRow } from "@/data/admin/tables";
import { BookOpen, Star, Users } from "@/components/admin/icons";

/* ─── Create Course Modal ───────────────────────────────────────────────────── */
function CreateCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", subject: "", grade: "grade1", description: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const GRADES = ["grade1","grade2","grade3","grade4","grade5","grade6","grade7","grade8","grade9","grade10"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Course title is required."); return; }
    setSaving(true); setError("");
    const result = await createCourse(form);
    setSaving(false);
    if (result.success) { setSaved(true); onCreated(); }
    else { setError(result.message); }
  }

  const f = (k: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>
      {type === "textarea" ? (
        <textarea rows={3} style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit" }}
          placeholder={placeholder} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
      ) : (
        <input type={type} style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }}
          placeholder={placeholder} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:500, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        {!saved ? (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Create New Course</h2>
              <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>
            {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {f("title",   "Course Title *",   "text",     "e.g. Introduction to Fractions")}
              {f("subject", "Subject",          "text",     "e.g. Mathematics")}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Grade Level</label>
                <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                  style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
                  {GRADES.map(g => <option key={g} value={g}>{g.replace("grade","Grade ")}</option>)}
                </select>
              </div>
              {f("description", "Description (optional)", "textarea", "Brief course description…")}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 20px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving ? .6 : 1 }}>
                  {saving ? "Creating…" : "Create Course"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#1e1b4b", marginBottom:8 }}>Course Created!</h2>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}><strong>{form.title}</strong> has been created as a draft. Go to the <strong>Editor</strong> to add lessons and content.</p>
            <button onClick={onClose} style={{ padding:"10px 24px", border:"none", borderRadius:10, background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:700, cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Course Modal ─────────────────────────────────────────────────────── */
function EditCourseModal({ course, onClose, onSaved }: { course: CourseRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: course.title,
    subject: course.subject === "—" ? "" : course.subject,
    grade: course.grade,
    rating: String(course.rating),
    status: course.status.toUpperCase() as "PUBLISHED" | "DRAFT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const GRADES = ["grade1","grade2","grade3","grade4","grade5","grade6","grade7","grade8","grade9","grade10"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Course title is required."); return; }
    setSaving(true); setError("");
    const result = await updateCourse(course.id, { ...form, rating: Number(form.rating) || 0 });
    setSaving(false);
    if (result.success) { onSaved(); onClose(); }
    else { setError(result.message); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:500, maxWidth:"calc(100vw - 32px)", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:0 }}>Edit Course</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>
        {error && <p style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>⚠️ {error}</p>}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Course Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Subject</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Grade Level</label>
            <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
              {GRADES.map(g => <option key={g} value={g}>{g.replace("grade","Grade ")}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Rating (0-5)</label>
            <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={e => setForm(p => ({ ...p, rating: e.target.value }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as typeof form.status }))}
              style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
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

export default function AdminCoursesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteCourse = async (course: CourseRow) => {
    if (!window.confirm(`Delete ${course.title}? This cannot be undone.`)) return;
    const result = await deleteCourse(course.id);
    if (result.success) loadCourses();
    else window.alert(result.message);
  };

  const loadCourses = () => {
    setLoading(true);
    fetchCourses().then((rows) => { setCourses(rows); setLoading(false); });
  };

  useEffect(() => { loadCourses(); }, []);

  // Quick Action links arrive as /admin/courses?new=1 and open this page's own create modal.
  useEffect(() => {
    // One-time deep-link handoff on mount, not a render-driven update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowCreateModal(true);
  }, []);

  /* =========================================
     Dynamic Course Statistics
  ========================================= */

  const courseStats = useMemo(() => {
    const totalCourses = courses.length;

    const publishedCourses = courses.filter(
      (course) => course.status === "Published"
    ).length;

    const draftCourses = courses.filter(
      (course) => course.status !== "Published"
    ).length;

    const totalLessons = courses.reduce(
      (total, course) =>
        total + Number(course.lessonsCount || 0),
      0
    );

    const totalEnrollments = courses.reduce(
      (total, course) =>
        total + Number(course.enrolledStudents || 0),
      0
    );

    const averageRating =
      totalCourses > 0
        ? courses.reduce(
          (total, course) =>
            total + Number(course.rating || 0),
          0
        ) / totalCourses
        : 0;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalLessons,
      totalEnrollments,
      averageRating,
    };
  }, [courses]);

  /* =========================================
     Course Table Columns
  ========================================= */

  const courseColumns: ColumnDef<CourseRow>[] = [
    {
      header: "Course Title",
      accessor: (row: CourseRow) => (
        <div className="flex items-center gap-3">
          {/* Course Icon */}
          <div className="course-avatar">
            <BookOpen className="h-5 w-5" />
          </div>

          {/* Course Details */}
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">
              {row.title}
            </div>

            <div className="text-xs text-slate-500">
              {row.grade} • {row.subject}
            </div>
          </div>
        </div>
      ),
    },

    {
      header: "Lessons",
      accessor: (row: CourseRow) => (
        <span className="course-lessons-badge">
          {Number(row.lessonsCount || 0)} Interactive Modules
        </span>
      ),
    },

    {
      header: "Enrolled Students",
      accessor: (row: CourseRow) => (
        <span className="course-enrollment">
          <Users className="h-4 w-4" />
          {Number(row.enrolledStudents || 0).toLocaleString()}
        </span>
      ),
    },

    {
      header: "Rating",
      accessor: (row: CourseRow) => (
        <span className="course-rating">
          <Star className="h-4 w-4" />
          {Number(row.rating || 0).toFixed(1)}
        </span>
      ),
    },

    {
      header: "Status",
      accessor: (row: CourseRow) => {
        const statusClass =
          row.status === "Published"
            ? "published"
            : "draft";

        return (
          <span
            className={`status-badge ${statusClass}`}
          >
            <span className="status-dot" />
            {row.status}
          </span>
        );
      },
    },
  ];

  const courseRowActions = [
    { label: "Edit", onClick: (row: CourseRow) => setEditingCourse(row) },
    {
      label: "Delete",
      danger: true,
      onClick: handleDeleteCourse,
    },
  ];

  return (
    <AdminLayout>
      {showCreateModal && (
        <CreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadCourses}
        />
      )}
      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSaved={loadCourses}
        />
      )}
      <div className="admin-courses-page">

        {/* =====================================
            Page Header
        ===================================== */}

        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumb">
              Admin / Courses
            </div>

            <h1 className="admin-page-title">
              Courses
            </h1>

            <p className="admin-page-subtitle">
              Manage curriculum, interactive modules,
              grade levels, enrollments and course performance.
            </p>
          </div>

          <button className="admin-primary-button" onClick={() => setShowCreateModal(true)}>
            + Create New Course
          </button>
        </div>

        {/* =====================================
            Dynamic Statistics
        ===================================== */}

        <div className="course-stats-grid">

          {/* Total Courses */}
          <div className="course-stat-card">
            <div className="course-stat-icon orange">
              <BookOpen className="h-6 w-6" />
            </div>

            <div className="course-stat-content">
              <span>Total Courses</span>

              <strong>
                {courseStats.totalCourses.toLocaleString()}
              </strong>

              <small>
                All curriculum courses
              </small>
            </div>
          </div>

          {/* Published Courses */}
          <div className="course-stat-card">
            <div className="course-stat-icon green">
              <BookOpen className="h-6 w-6" />
            </div>

            <div className="course-stat-content">
              <span>Published Courses</span>

              <strong>
                {courseStats.publishedCourses.toLocaleString()}
              </strong>

              <small className="course-success-text">
                Live on platform
              </small>
            </div>
          </div>

          {/* Enrollments */}
          <div className="course-stat-card">
            <div className="course-stat-icon blue">
              <Users className="h-6 w-6" />
            </div>

            <div className="course-stat-content">
              <span>Total Enrollments</span>

              <strong>
                {courseStats.totalEnrollments.toLocaleString()}
              </strong>

              <small>
                Student enrollments
              </small>
            </div>
          </div>

          {/* Average Rating */}
          <div className="course-stat-card">
            <div className="course-stat-icon amber">
              <Star className="h-6 w-6" />
            </div>

            <div className="course-stat-content">
              <span>Average Rating</span>

              <strong>
                {courseStats.averageRating.toFixed(1)}
                <small className="rating-scale">
                  {" "}
                  / 5.0
                </small>
              </strong>

              <small>
                Student course rating
              </small>
            </div>
          </div>
        </div>

        {/* =====================================
            Course Overview
        ===================================== */}

        <div className="course-overview-grid">

          {/* Interactive Modules */}
          <div className="course-overview-card">

            <div className="course-overview-header">
              <div>
                <span>Interactive Modules</span>

                <strong>
                  {courseStats.totalLessons.toLocaleString()}
                </strong>
              </div>

              <div className="course-overview-icon orange">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <p>
              Total interactive lessons available
              across all courses.
            </p>
          </div>

          {/* Published Rate */}
          <div className="course-overview-card">

            <div className="course-overview-header">
              <div>
                <span>Published Rate</span>

                <strong>
                  {courseStats.totalCourses > 0
                    ? Math.round(
                      (courseStats.publishedCourses /
                        courseStats.totalCourses) *
                      100
                    )
                    : 0}
                  %
                </strong>
              </div>

              <div className="course-overview-icon green">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <div className="course-progress">
              <div
                className="course-progress-fill"
                style={{
                  width: `${courseStats.totalCourses > 0
                      ? (courseStats.publishedCourses /
                        courseStats.totalCourses) *
                      100
                      : 0
                    }%`,
                }}
              />
            </div>

            <p>
              {courseStats.publishedCourses} published out of{" "}
              {courseStats.totalCourses} total courses.
            </p>
          </div>

          {/* Draft Courses */}
          <div className="course-overview-card">

            <div className="course-overview-header">
              <div>
                <span>Draft Courses</span>

                <strong>
                  {courseStats.draftCourses.toLocaleString()}
                </strong>
              </div>

              <div className="course-overview-icon purple">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <p>
              Courses currently being prepared or
              awaiting publication.
            </p>
          </div>
        </div>

        {/* =====================================
            Course Directory
        ===================================== */}

        <div className="course-directory-card">
          <ReusableTable
            title="Curriculum & Course Catalog"
            subtitle={loading ? "Loading courses…" : "Manage learning paths, grade levels, interactive modules, enrollments and published courses."}
            data={courses}
            columns={courseColumns}
            searchPlaceholder="Search courses by title, subject or grade..."
            primaryActionLabel="Create New Course"
            onPrimaryAction={() => setShowCreateModal(true)}
            rowActions={courseRowActions}
          />
        </div>
      </div>
    </AdminLayout>
  );
}