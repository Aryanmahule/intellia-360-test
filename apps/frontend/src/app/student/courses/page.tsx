"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useStudentContext } from "@/context/StudentContext";
import "./courses.css";
interface CourseTopic {
  id: string;
  title: string;
  status?: string;
  estimatedTime?: string;
}

interface CourseChapter {
  id: string;
  chapterNumber?: number | string;
  title: string;
  topics?: CourseTopic[];
  topicsCount?: number;
}

interface CourseCurriculum {
  chapters: CourseChapter[];
}

interface CourseData {
  id: string;
  title: string;
  chapterNumber: number | string;
  topics: CourseTopic[];
  completed: number;
  total: number;
  progress: number;
  firstTopicId?: string;
}


function BookIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 4.5C5 3.67 5.67 3 6.5 3H19V18H6.5C5.67 18 5 18.67 5 19.5C5 20.33 5.67 21 6.5 21H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.5V4.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13v4M8.5 20h7M10 17h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m13 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

export default function StudentCoursesPage() {
  const {
    curriculum,
    currentGrade,
    completedLessons,
    xpPoints,
    learningGems,
    streakDays,
    activeLessonData,
  } = useStudentContext();

  const typedCurriculum =
    curriculum as CourseCurriculum | null;

  /*
   * Convert curriculum into course/chapter cards.
   */
  const courses = useMemo<CourseData[]>(() => {
    if (!typedCurriculum?.chapters) {
      return [];
    }

    return typedCurriculum.chapters.map(
      (chapter) => {
        const topics = chapter.topics ?? [];

        const completed = topics.filter(
          (topic) =>
            completedLessons.includes(topic.id)
        ).length;

        const total = topics.length;

        return {
          id: chapter.id,
          title: chapter.title,
          chapterNumber:
            chapter.chapterNumber ?? 0,
          topics,
          completed,
          total,
          progress:
            total > 0
              ? Math.round(
                (completed / total) * 100
              )
              : 0,
          firstTopicId: topics[0]?.id,
        };
      }
    );
  }, [
    typedCurriculum,
    completedLessons,
  ]);

  const totalLessons = courses.reduce(
    (sum, course) => sum + course.total,
    0
  );

  const completedTotal = courses.reduce(
    (sum, course) =>
      sum + course.completed,
    0
  );

  const overallProgress =
    totalLessons > 0
      ? Math.round(
        (completedTotal / totalLessons) *
        100
      )
      : 0;

  const continueTopic =
    activeLessonData?.id ||
    courses.find(
      (course) => course.firstTopicId
    )?.firstTopicId;

  if (!typedCurriculum) {
    return (
      <main className="courses-page courses-page-gamified">
        <div className="courses-loading">
          <div className="loading-orb" />
          <h2>Preparing your learning world...</h2>
          <p>
            Loading your courses and progress.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="courses-page">
      <div className="courses-page-inner">

        {/* =================================================
            HEADER
        ================================================== */}

        <header className="courses-header">
          <div>
            <span className="courses-eyebrow">
              YOUR LEARNING JOURNEY
            </span>

            <h1 className="courses-page-title">Courses</h1>

            <p>
              Explore your curriculum, complete
              quests and level up your knowledge.
            </p>
          </div>

          <div className="courses-header-actions">
            <Link
              href="/student/leaderboard"
              className="courses-header-stat"
            >
              <TrophyIcon />

              <span>
                <strong>
                  {xpPoints ?? 0}
                </strong>
                <small>XP</small>
              </span>
            </Link>

            <div className="courses-header-stat">
              <TargetIcon />

              <span>
                <strong>
                  {streakDays ?? 0}
                </strong>
                <small>Day Streak</small>
              </span>
            </div>
          </div>
        </header>

        {/* =================================================
            JOURNEY OVERVIEW
        ================================================== */}

        <section className="course-overview">
          <div className="overview-main">

            <div className="overview-icon">
              <BookIcon />
            </div>

            <div className="overview-content">
              <span className="overview-label">
                {currentGrade
                  ? currentGrade.toUpperCase()
                  : "STUDENT"}{" "}
                CURRICULUM
              </span>

              <h2>
                Your Learning Journey
              </h2>

              <p>
                {completedTotal} of{" "}
                {totalLessons} lessons
                completed
              </p>

              <div className="overall-progress">
                <div className="overall-progress-track">
                  <div
                    className="overall-progress-fill"
                    style={{
                      width: `${overallProgress}%`,
                    }}
                  />
                </div>

                <strong>
                  {overallProgress}%
                </strong>
              </div>
            </div>
          </div>

          <div className="overview-stats">
            <div className="overview-stat">
              <strong>
                {courses.length}
              </strong>
              <span>Chapters</span>
            </div>

            <div className="overview-stat">
              <strong>
                {completedTotal}
              </strong>
              <span>Completed</span>
            </div>

            <div className="overview-stat">
              <strong>
                {learningGems ?? 0}
              </strong>
              <span>Gems</span>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTINUE LEARNING
        ================================================== */}

        {continueTopic && (
          <section className="continue-card">
            <div className="continue-left">
              <div className="continue-play">
                <PlayIcon />
              </div>

              <div>
                <span className="continue-label">
                  CONTINUE YOUR QUEST
                </span>

                <h3>
                  {activeLessonData?.title ||
                    "Start your first lesson"}
                </h3>

                <p>
                  Pick up where you left off
                  and keep your learning streak
                  alive.
                </p>
              </div>
            </div>

            <Link
              href={`/student/lesson/${encodeURIComponent(
                continueTopic
              )}`}
              className="continue-button"
            >
              Continue
              <ArrowIcon />
            </Link>
          </section>
        )}

        {/* =================================================
            COURSE GRID
        ================================================== */}

        <section className="courses-section">

          <div className="section-heading">
            <div>
              <span className="section-eyebrow">
                CURRICULUM
              </span>

              <h2 className="courses-section-title">Choose Your Quest</h2>
            </div>

            <span className="course-count">
              {courses.length}{" "}
              {courses.length === 1
                ? "Chapter"
                : "Chapters"}
            </span>
          </div>

          <div className="course-grid">
            {courses.map(
              (course, index) => {

                const actionTopic =
                  course.topics.find(
                    (topic) =>
                      !completedLessons.includes(
                        topic.id
                      ) &&
                      topic.status !==
                      "locked"
                  ) ||
                  course.topics[0];

                const isCompleted =
                  course.total > 0 &&
                  course.completed ===
                  course.total;

                return (
                  <article
                    key={course.id}
                    className={`course-card ${isCompleted
                      ? "course-complete"
                      : ""
                      }`}
                  >
                    {/* 3D CARD TOP */}
                    <div className="course-card-visual">

                      <div className="course-orbit orbit-one" />
                      <div className="course-orbit orbit-two" />

                      <div className="course-cube">
                        {String(course.chapterNumber).padStart(2, "0")}
                      </div>

                      <span className="course-chapter-number course-chapter-number-large">
                        CHAPTER{" "}
                        {course.chapterNumber}
                      </span>

                      {isCompleted && (
                        <span className="course-completed">
                          COMPLETED
                        </span>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="course-card-content">

                      <div className="course-card-title-row">
                        <h3>
                          {course.title}
                        </h3>

                        <span className="course-percentage">
                          {course.progress}%
                        </span>
                      </div>

                      <p className="course-description course-description-large">
                        {course.total}{" "}
                        {course.total === 1
                          ? "lesson"
                          : "lessons"}{" "}
                        in this learning
                        chapter.
                      </p>

                      {/* PROGRESS */}
                      <div className="course-progress">
                        <div className="course-progress-track">
                          <div
                            className="course-progress-fill"
                            style={{
                              width: `${course.progress}%`,
                            }}
                          />
                        </div>

                        <span>
                          {course.completed}/
                          {course.total}
                        </span>
                      </div>

                      {/* TOPICS PREVIEW */}
                      <div className="course-topics">
                        {course.topics
                          .slice(0, 3)
                          .map(
                            (topic) => {
                              const done =
                                completedLessons.includes(
                                  topic.id
                                );

                              return (
                                <div
                                  key={
                                    topic.id
                                  }
                                  className={
                                    done
                                      ? "topic-done"
                                      : ""
                                  }
                                >
                                  <span className="topic-check">
                                    {done
                                      ? "✓"
                                      : ""}
                                  </span>

                                  <span className="course-topic-title">
                                    {
                                      topic.title
                                    }
                                  </span>
                                </div>
                              );
                            }
                          )}

                        {course.topics
                          .length > 3 && (
                            <span className="more-topics">
                              +
                              {course
                                .topics
                                .length -
                                3}{" "}
                              more
                            </span>
                          )}
                      </div>

                      {/* ACTION */}
                      {actionTopic ? (
                        <Link
                          href={`/student/lesson/${encodeURIComponent(
                            actionTopic.id
                          )}`}
                          className="course-action"
                        >
                          <span>
                            {isCompleted
                              ? "Review Chapter"
                              : course.completed >
                                0
                                ? "Continue Quest"
                                : "Start Quest"}
                          </span>

                          <ArrowIcon />
                        </Link>
                      ) : (
                        <div className="course-action disabled">
                          No lessons available
                        </div>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            LEARNING PATH
        ================================================== */}

        <section className="learning-path">

          <div className="section-heading">
            <div>
              <span className="section-eyebrow">
                YOUR PROGRESS
              </span>

              <h2 className="courses-path-title">Learning Path</h2>
            </div>
          </div>

          <div className="path-container">

            {courses.map(
              (course, index) => (
                <React.Fragment
                  key={course.id}
                >
                  <div
                    className={`path-node ${course.progress ===
                      100
                      ? "complete"
                      : course.progress >
                        0
                        ? "current"
                        : ""
                      }`}
                  >
                    <span>
                      {course.progress ===
                        100
                        ? "✓"
                        : index + 1}
                    </span>

                    <small>
                      {course.title}
                    </small>
                  </div>

                  {index <
                    courses.length - 1 && (
                      <div
                        className={`path-line ${course.progress ===
                          100
                          ? "complete"
                          : ""
                          }`}
                      />
                    )}
                </React.Fragment>
              )
            )}
          </div>
        </section>

      </div>
    </main>
  );
}