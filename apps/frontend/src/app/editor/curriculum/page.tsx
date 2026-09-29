"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface GradeMeta { id: string; label: string; hasCurriculum: boolean; }

export default function CurriculumIndexPage() {
  const [grades, setGrades] = useState<GradeMeta[]>([]);

  useEffect(() => {
    apiFetch("/api/editor/grades").then((r) => r.json()).then((j) => {
      if (j.success) setGrades(j.data);
    });
  }, []);

  return (
    <div className="ed-page">
      <div className="ed-page-header">
        <div>
          <h2 className="ed-page-title">Curriculum JSON</h2>
          <p className="ed-page-sub">Select a grade to view and edit its curriculum.json file.</p>
        </div>
      </div>
      <div className="ed-card-grid">
        {grades.map((g) => (
          <Link key={g.id} href={`/editor/curriculum/${g.id}`} className="ed-grade-card">
            <div className="ed-grade-card-icon">🗂</div>
            <div className="ed-grade-card-label">{g.label}</div>
            <div className={`ed-grade-card-status${g.hasCurriculum ? "" : " missing"}`}>
              {g.hasCurriculum ? "✅ curriculum.json" : "⚠️ Missing"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
