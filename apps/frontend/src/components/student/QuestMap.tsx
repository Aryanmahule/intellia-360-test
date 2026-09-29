"use client";

import React from "react";
import { useStudentContext } from "@/context/StudentContext";

export default function QuestMap() {
  const { activeLessonData } = useStudentContext();

  const title = activeLessonData?.title || "Select a lesson";

  return (
    <div className="quest-map-active-card">
      <div className="active-topic-icon">🧊</div>
      <div className="active-topic-info">
        <span className="active-topic-title">{title}</span>
      </div>
      <div className="active-topic-status-check">✓</div>
    </div>
  );
}
