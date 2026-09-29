"use client";
import React from "react";

interface StreakBadgeProps {
  streakDays?: number;
}

export default function StreakBadge({ streakDays = 1 }: StreakBadgeProps) {
  const handleClick = () => {
    alert(`You are on a ${streakDays} day streak! Keep it up!`);
  };

  return (
    <div className="stat-badge streak-badge" onClick={handleClick} style={{cursor: "pointer"}}>
      <span className="badge-icon">🔥</span>
      <div className="badge-content">
        <span className="badge-value">{streakDays}</span>
        <span className="badge-label">Day Streak</span>
      </div>
    </div>
  );
}
