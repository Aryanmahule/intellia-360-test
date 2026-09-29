"use client";

import React, { useEffect, useRef } from "react";
import { useStudentContext } from "@/context/StudentContext";

const ICON_MAP: Record<string, string> = {
  crown: "👑",
  star: "⭐",
  book: "📖",
  cube: "🧊",
};

export default function TopicList() {
  const {
    curriculum,
    activeLessonId,
    setActiveLessonId,
    completedLessons,
  } = useStudentContext();

  const activeTopicRef = useRef<HTMLLIElement>(null);

  const [openChapters, setOpenChapters] = React.useState<
    Record<string, boolean>
  >({});

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  useEffect(() => {
    if (activeTopicRef.current) {
      activeTopicRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeLessonId]);

  if (!curriculum) return null;

  // Find active chapter
  let currentChapter = curriculum.chapters.find((c) =>
    c.topics.some((t) => t.id === activeLessonId)
  );

  if (!currentChapter && curriculum.chapters.length > 0) {
    currentChapter = curriculum.chapters[0];
  }

  const standaloneTopics = currentChapter?.topics ?? [];

  const otherChapters = curriculum.chapters.filter(
    (c) => c.id !== currentChapter?.id
  );

  return (
    <div className="topic-list-container">

      {/* ================================
          ACTIVE CHAPTER TOPICS
          ================================ */}

      <ul className="standalone-topics-list">
        {standaloneTopics.map((topic) => {
          const isCompleted = completedLessons.includes(topic.id);

          return (
            <li
              key={topic.id}
              ref={
                topic.id === activeLessonId
                  ? activeTopicRef
                  : null
              }
              className={`topic-item ${isCompleted ? "topic-completed" : ""
                } ${topic.id === activeLessonId
                  ? "active-topic"
                  : ""
                }`}
              onClick={() => {
                if (
                  topic.status !== "locked" &&
                  topic.id
                ) {
                  setActiveLessonId(topic.id);
                }
              }}
              style={{
                cursor:
                  topic.status !== "locked"
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {/* Icon */}
              <span className="topic-icon">
                {topic.icon
                  ? ICON_MAP[topic.icon] ?? "📌"
                  : "📌"}
              </span>

              {/* Topic information */}
              <div className="topic-text-group">
                <span className="topic-title">
                  {topic.title}
                </span>

                {topic.estimatedTime && (
                  <span className="topic-questions-count">
                    {topic.estimatedTime}
                  </span>
                )}
              </div>

              {/* COMPLETED */}
              {isCompleted && (
                <span className="completed-badge">
                  ✓
                </span>
              )}

              {/* Locked */}
              {!isCompleted &&
                topic.status === "locked" && (
                  <span className="lock-icon">
                    🔒
                  </span>
                )}
            </li>
          );
        })}
      </ul>

      {/* ================================
          CHAPTERS ACCORDION
          ================================ */}

      <div className="chapters-accordion-group">
        {otherChapters.map((chapter) => (
          <div
            key={chapter.id}
            className="chapter-accordion-item"
          >
            <div
              className="chapter-accordion-header"
              onClick={() =>
                toggleChapter(chapter.id)
              }
              style={{ cursor: "pointer" }}
            >
              <span
                className="accordion-chevron"
                style={{
                  transform: openChapters[chapter.id]
                    ? "rotate(0deg)"
                    : "rotate(-90deg)",
                  transition:
                    "transform 0.2s",
                }}
              >
                ▾
              </span>

              <span className="chapter-title">
                {chapter.chapterNumber}.{" "}
                {chapter.title}
              </span>

              <span className="chapter-badge-count">
                {chapter.topicsCount}
              </span>
            </div>

            {openChapters[chapter.id] &&
              chapter.topics &&
              chapter.topics.length > 0 && (
                <ul className="chapter-subtopics-list">
                  {chapter.topics.map((subtopic) => {
                    const isCompleted =
                      completedLessons.includes(
                        subtopic.id
                      );

                    return (
                      <li
                        key={subtopic.id}
                        ref={
                          subtopic.id ===
                            activeLessonId
                            ? activeTopicRef
                            : null
                        }
                        className={`subtopic-item ${isCompleted
                          ? "subtopic-completed"
                          : ""
                          } ${subtopic.id ===
                            activeLessonId
                            ? "active-subtopic"
                            : ""
                          }`}
                        onClick={() => {
                          if (
                            subtopic.status !==
                            "locked" &&
                            subtopic.id
                          ) {
                            setActiveLessonId(
                              subtopic.id
                            );
                          }
                        }}
                        style={{
                          cursor:
                            subtopic.status !==
                              "locked"
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        <span className="subtopic-bullet">
                          {isCompleted ? "✓" : "•"}
                        </span>

                        <span className="subtopic-title">
                          {subtopic.title}
                        </span>

                        {/* COMPLETED */}
                        {isCompleted && (
                          <span className="completed-badge">

                          </span>
                        )}

                        {/* Locked */}
                        {!isCompleted &&
                          subtopic.status ===
                          "locked" && (
                            <span className="lock-icon">
                              🔒
                            </span>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}