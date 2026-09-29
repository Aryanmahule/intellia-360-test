import React from "react";

interface GradeSelectorProps {
  currentGrade?: string;
  onChangeGrade?: (grade: string) => void;
}

export default function GradeSelector({
  currentGrade = "grade1",
  onChangeGrade,
}: GradeSelectorProps) {
  const grades = [
    { id: "grade1", label: "Grade 1 Math" },
    { id: "grade2", label: "Grade 2 Math" },
    { id: "grade3", label: "Grade 3 Math" },
    { id: "grade4", label: "Grade 4 Math" },
    { id: "grade5", label: "Grade 5 Math" },
    { id: "grade7", label: "Grade 7 Math" },
    { id: "grade10", label: "Grade 10 Math" },
  ];
  
  const currentLabel = grades.find(g => g.id === currentGrade)?.label || "Grade Math";

  return (
    <div className="grade-selector" style={{ position: "relative" }}>
      <select 
        value={currentGrade}
        onChange={(e) => onChangeGrade && onChangeGrade(e.target.value)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer"
        }}
      >
        {grades.map((g) => (
          <option key={g.id} value={g.id}>{g.label}</option>
        ))}
      </select>
      <span className="grade-text">{currentLabel}</span>
      <span className="grade-arrow">▾</span>
    </div>
  );
}
