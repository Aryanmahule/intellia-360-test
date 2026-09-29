"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface GradeMeta {
  id: string;
  label: string;
  lessonCount: number;
  hasCurriculum: boolean;
}

interface LessonSummary {
  id: string;
  title: string;
  grade: string;
  chapterId: string;
  estimatedMinutes: number;
  locked: boolean;
  completed: boolean;
}

export default function CoursesPage() {
  const [grades, setGrades]     = useState<GradeMeta[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [lessons, setLessons]   = useState<LessonSummary[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    apiFetch("/api/editor/grades")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.length > 0) {
          setGrades(j.data);
          setSelected(j.data[0].id);
        }
      });
  }, []);

  const loadLessons = useCallback((gradeId: string) => {
    if (!gradeId) return;
    setLoading(true);
    apiFetch(`/api/editor/lessons/${gradeId}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setLessons(j.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLessons(selected); }, [selected, loadLessons]);

  const byChapter = lessons.reduce<Record<string, LessonSummary[]>>((acc, l) => {
    const ch = l.chapterId || "Uncategorised";
    (acc[ch] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="ed-page">
      <div className="ed-page-header">
        <div>
          <h2 className="ed-page-title">Courses</h2>
          <p className="ed-page-sub">Browse all lessons organised by grade and chapter.</p>
        </div>
        {/* Lessons are created on the Lessons page; /editor/lessons/new never existed. */}
        <Link href={selected ? `/editor/lessons?grade=${selected}` : "/editor/lessons"} className="ed-btn-primary">+ New Lesson</Link>
      </div>

      {/* Grade picker */}
      <div className="ed-grade-tabs">
        {grades.map((g) => (
          <button
            key={g.id}
            className={`ed-grade-tab${selected === g.id ? " active" : ""}`}
            onClick={() => setSelected(g.id)}
          >
            {g.label}
            <span className="ed-grade-tab-count">{g.lessonCount}</span>
          </button>
        ))}
      </div>

      {/* Lessons by chapter */}
      {loading ? (
        <div className="ed-empty">Loading lessons…</div>
      ) : lessons.length === 0 ? (
        <div className="ed-empty">
          No lessons for {selected.replace("grade", "Grade ")} yet.{" "}
          <Link href={`/editor/lessons?grade=${selected}`} className="ed-link">Add one →</Link>
        </div>
      ) : (
        Object.entries(byChapter).map(([chapterId, chLessons]) => (
          <div key={chapterId} className="ed-panel" style={{ marginBottom: 16 }}>
            <div className="ed-panel-header">
              <span className="ed-panel-title">📖 {chapterId}</span>
              <span className="ed-panel-link">{chLessons.length} lessons</span>
            </div>
            <div className="ed-table-wrap">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Est. Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chLessons.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span className="ed-lesson-title">{l.title}</span>
                        <span className="ed-lesson-id">{l.id}</span>
                      </td>
                      <td>{l.estimatedMinutes} min</td>
                      <td>
                        <span className={`ed-tag${l.locked ? " locked" : " active"}`}>
                          {l.locked ? "🔒 Locked" : "✅ Active"}
                        </span>
                      </td>
                      <td className="ed-actions-cell">
                        <Link
                          href={`/editor/lessons/${selected}/${l.id}`}
                          className="ed-btn-sm"
                        >
                          ✏️ Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
