"use client";
import React from "react";

interface GemsBadgeProps {
  learningGems?: number;
}

export default function GemsBadge({ learningGems = 0 }: GemsBadgeProps) {
  const handleClick = () => {
    alert(`You have earned ${learningGems} Learning Gems!`);
  };

  return (
    <div className="stat-badge gems-badge" onClick={handleClick} style={{cursor: "pointer"}}>
      <span className="badge-icon">💎</span>
      <div className="badge-content">
        <span className="badge-value">{learningGems}</span>
        <span className="badge-label">Gems</span>
      </div>
    </div>
  );
}
