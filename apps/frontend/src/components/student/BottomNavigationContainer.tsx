"use client";

import React from "react";
import { useStudentContext } from "@/context/StudentContext";

interface BottomNavigationContainerProps {
  onPrevious: () => void;
  onNext: () => void;
}

export default function BottomNavigationContainer({
  onPrevious,
  onNext,
}: BottomNavigationContainerProps) {
  const { activeLessonId, curriculum, completedLessons } =
    useStudentContext();

  const allTopics = curriculum
    ? curriculum.chapters.flatMap((chapter) => chapter.topics)
    : [];

  const currentIndex = allTopics.findIndex(
    (topic) => topic.id === activeLessonId
  );

  const prevTopic =
    currentIndex > 0 ? allTopics[currentIndex - 1] : null;

  const nextTopic =
    currentIndex >= 0 &&
      currentIndex < allTopics.length - 1
      ? allTopics[currentIndex + 1]
      : null;

  const completedCount = allTopics.filter((topic) =>
    completedLessons.includes(topic.id)
  ).length;

  const totalCount = allTopics.length;

  const progress =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;

  const currentNumber =
    currentIndex >= 0 ? currentIndex + 1 : 1;

  return (
    <nav className="bottom-navigation-container">
      {/* ==================================================
          PREVIOUS QUEST
          ================================================== */}

      <div
        className={`quest-nav-card quest-prev ${!prevTopic ? "quest-disabled" : ""
          }`}
        onClick={prevTopic ? onPrevious : undefined}
      >
        <button
          className="quest-nav-button"
          onClick={onPrevious}
          disabled={!prevTopic}
          aria-label="Previous lesson"
        >
          <span className="quest-arrow">←</span>
        </button>

        <div className="quest-nav-info">
          <span className="quest-nav-label">
            ← BACK QUEST
          </span>

          <span className="quest-nav-title">
            {prevTopic
              ? prevTopic.title
              : "Start of Adventure"}
          </span>
        </div>
      </div>

      {/* ==================================================
          CENTER QUEST PROGRESS
          ================================================== */}

      <div className="quest-progress-center">
        {/* Top reward */}

        <div className="quest-progress-reward">
          <span className="quest-trophy">🏆</span>

          <span>
            {completedCount} / {totalCount} Quests
          </span>
        </div>

        {/* Quest path */}

        <div className="quest-path">
          <span className="quest-path-dot completed">
            ✓
          </span>

          <span className="quest-path-line">
            <span
              className="quest-path-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </span>

          <span className="quest-path-dot current">
            ⭐
          </span>

          <span className="quest-path-line dashed">
            <span />
          </span>

          <span className="quest-path-dot locked">
            🔒
          </span>
        </div>

        {/* Current position */}

        <div className="quest-progress-text">
          <span className="quest-progress-number">
            Quest {currentNumber}
          </span>

          <span className="quest-progress-percent">
            {progress}% Complete
          </span>
        </div>
      </div>

      {/* ==================================================
          NEXT QUEST
          ================================================== */}

      <div
        className={`quest-nav-card quest-next ${!nextTopic ? "quest-disabled" : ""
          }`}
        onClick={nextTopic ? onNext : undefined}
      >
        <div className="quest-nav-info next-info">
          <span className="quest-nav-label">
            NEXT QUEST →
          </span>

          <span className="quest-nav-title">
            {nextTopic
              ? nextTopic.title
              : "🎉 Adventure Complete!"}
          </span>
        </div>

        <button
          className="quest-nav-button next-button"
          onClick={onNext}
          disabled={!nextTopic}
          aria-label="Next lesson"
        >
          <span className="quest-arrow">→</span>
        </button>
      </div>
    </nav>
  );
}