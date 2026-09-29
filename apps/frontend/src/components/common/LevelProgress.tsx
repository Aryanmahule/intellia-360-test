import React from "react";

interface LevelProgressProps {
  levelTitle?: string;
  levelNumber?: number;
  progressPercentage?: number;
}

export default function LevelProgress({
  levelTitle = "Explorer",
  levelNumber = 2,
  progressPercentage = 65,
}: LevelProgressProps) {
  return (
    <div className="level-progress-container">
      <div className="level-info">
        <span className="level-icon">⭐</span>
        <span className="level-text">
          {levelTitle} • Level {levelNumber}
        </span>
      </div>
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
