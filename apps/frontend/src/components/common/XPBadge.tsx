"use client";
import React from "react";

interface XPBadgeProps {
  xpPoints?: number;
}

export default function XPBadge({ xpPoints = 0 }: XPBadgeProps) {
  const handleClick = () => {
    alert(`You have ${xpPoints} XP Points! Keep completing lessons to earn more.`);
  };

  return (
    <div className="stat-badge xp-badge" onClick={handleClick} style={{cursor: "pointer"}}>
      <span className="badge-icon">⭐</span>
      <div className="badge-content">
        <span className="badge-value">{xpPoints}</span>
        <span className="badge-label">XP Points</span>
      </div>
    </div>
  );
}
