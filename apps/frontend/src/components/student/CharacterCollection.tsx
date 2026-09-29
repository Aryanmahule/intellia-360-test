import React from "react";
import rewardsData from "@/data/rewards-data.json";

export default function CharacterCollection() {
  const characters = rewardsData.characters || [];

  return (
    <div className="character-collection-widget">
      <div className="character-collection-header">
        <span className="widget-title">Character Collection</span>
        <a href="/student/rewards" className="view-all-link">
          View All ›
        </a>
      </div>
      <div className="character-avatars-row">
        {characters.map((char) => (
          <div key={char.id} className="character-avatar-item" title={char.name}>
            <div className="character-avatar-placeholder">
              {char.id === "c_1" && "🐼"}
              {char.id === "c_2" && "🦊"}
              {char.id === "c_3" && "🐻"}
              {char.id === "c_4" && "🐧"}
              {char.id === "c_5" && "🐰"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
