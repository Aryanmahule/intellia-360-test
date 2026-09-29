"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface GradeMeta {
  id: string;
  label: string;
  lessonCount: number;
  hasCurriculum: boolean;
  hasDashboard: boolean;
}

export default function GradesPage() {
  const [grades, setGrades]   = useState<GradeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId]     = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/api/editor/grades")
      .then((r) => r.json())
      .then((j) => { if (j.success) setGrades(j.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createGrade(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setCreating(true);
    const r = await apiFetch("/api/editor/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gradeId: newId.trim() }),
    }).then((r) => r.json());
    setCreating(false);
    if (r.success) { setSuccess(`${newId} created!`); setNewId(""); load(); }
    else setError(r.message);
  }

  async function deleteGrade(id: string) {
    if (!confirm(`Delete ${id} and all its lessons? This cannot be undone.`)) return;
    const r = await apiFetch(`/api/editor/grades/${id}`, { method: "DELETE" }).then((r) => r.json());
    if (r.success) load(); else alert(r.message);
  }

  return (
    <div className="ed-page">
      <div className="ed-page-header">
        <div>
          <h2 className="ed-page-title">Grades</h2>
          <p className="ed-page-sub">Manage grade directories and their curriculum structure.</p>
        </div>
      </div>

      {/* Create form */}
      <div className="ed-panel ed-create-panel">
        <div className="ed-panel-header">
          <span className="ed-panel-title">➕ Add Grade</span>
        </div>
        <div className="ed-panel-body">
          <form className="ed-inline-form" onSubmit={createGrade}>
            <input
              className="ed-input"
              placeholder="grade8  (must match grade<number>)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              pattern="grade\d+"
              required
            />
            <button className="ed-btn-primary" disabled={creating}>
              {creating ? "Creating…" : "Create Grade"}
            </button>
          </form>
          {error   && <p className="ed-error-msg">{error}</p>}
          {success && <p className="ed-success-txt">{success}</p>}
        </div>
      </div>

      {/* Table */}
      <div className="ed-panel">
        <div className="ed-panel-header">
          <span className="ed-panel-title">🎓 All Grades ({grades.length})</span>
          <button className="ed-panel-link" onClick={load}>↻ Refresh</button>
        </div>
        <div className="ed-table-wrap">
          {loading ? (
            <div className="ed-empty">Loading grades…</div>
          ) : (
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Lessons</th>
                  <th>Curriculum</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span className="ed-grade-badge">{g.label}</span>
                    </td>
                    <td>
                      <span className={`ed-count-badge${g.lessonCount === 0 ? " warn" : ""}`}>
                        {g.lessonCount} lesson{g.lessonCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td>
                      <span className={`ed-status-dot${g.hasCurriculum ? " ok" : " missing"}`}>
                        {g.hasCurriculum ? "✅ Present" : "⚠️ Missing"}
                      </span>
                    </td>
                    <td className="ed-actions-cell">
                      <Link href={`/editor/lessons?grade=${g.id}`} className="ed-btn-sm">
                        📝 Lessons
                      </Link>
                      <Link href={`/editor/curriculum/${g.id}`} className="ed-btn-sm">
                        🗂 Curriculum
                      </Link>
                      <button className="ed-btn-sm danger" onClick={() => deleteGrade(g.id)}>
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
