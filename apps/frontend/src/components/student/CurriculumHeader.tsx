import React from "react";

interface CurriculumHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function CurriculumHeader({
  title = "Curriculum",
  subtitle = "Quest Map",
}: CurriculumHeaderProps) {
  return (
    <div className="curriculum-header">
      <span className="back-arrow">‹</span>
      <span className="curriculum-breadcrumb">
        {title} / <strong>{subtitle}</strong>
      </span>
    </div>
  );
}
