"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudentContext } from "@/context/StudentContext";

type NavItem = {
  label: string;
  icon: IconName;
  href?: string;
};

type IconName =
  | "learning"
  | "courses"
  | "assignments"
  | "quizzes"
  | "achievements"
  | "leaderboard"
  | "notifications"
  | "profile"
  | "lessons";

export default function Sidebar() {
  const {
    curriculum,
    currentGrade,
    activeLessonData,
    setActiveLessonId,
    completedLessons,
  } = useStudentContext();

  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(true);

  const [openChapters, setOpenChapters] = useState<
    Record<string, boolean>
  >({});

  const currentLessonId = activeLessonData?.id;

  /*
   * Automatically open the chapter
   * containing the current lesson.
   */
  useEffect(() => {
    if (!curriculum?.chapters || !currentLessonId) return;

    const currentChapter = curriculum.chapters.find((chapter) =>
      chapter.topics.some(
        (topic) => topic.id === currentLessonId
      )
    );

    if (currentChapter) {
      setOpenChapters((previous) => ({
        ...previous,
        [currentChapter.id]: true,
      }));
    }
  }, [curriculum, currentLessonId]);

  /*
   * Toggle individual chapter.
   */
  const toggleChapter = (chapterId: string) => {
    setOpenChapters((previous) => ({
      ...previous,
      [chapterId]: !previous[chapterId],
    }));
  };

  /*
   * Student navigation.
   */
  const navItems: NavItem[] = [
    {
      label: "My Learning",
      icon: "learning",
      href: "/student/dashboard",
    },
    {
      label: "Courses",
      icon: "courses",
      href: "/student/courses",
    },
    {
      label: "Assignments",
      icon: "assignments",
      href: "/student/assignments",
    },
    {
      label: "Quizzes",
      icon: "quizzes",
      href: "/student/quiz",
    },
    {
      label: "Achievements",
      icon: "achievements",
      href: "/student/rewards",
    },
    {
      label: "Leaderboard",
      icon: "leaderboard",
      href: "/student/leaderboard",
    },
    {
      label: "Notifications",
      icon: "notifications",
      href: "/student/notifications",
    },
    {
      label: "Profile",
      icon: "profile",
      href: "/student/profile",
    },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;

    if (href === "/student/dashboard") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  /*
   * Loading state.
   */
  if (!curriculum) {
    return (
      <aside
        className={`student-sidebar-container ${collapsed ? "is-collapsed" : ""
          }`}
      >
        <SidebarHeader
          collapsed={collapsed}
          onToggle={() =>
            setCollapsed((value) => !value)
          }
        />

        {!collapsed && (
          <div className="student-sidebar-loading">
            Loading curriculum...
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={`student-sidebar-container ${collapsed ? "is-collapsed" : ""
        }`}
    >
      {/* =========================================
          SIDEBAR HEADER
      ========================================== */}
      <SidebarHeader
        collapsed={collapsed}
        onToggle={() =>
          setCollapsed((value) => !value)
        }
      />

      {/* Wrapper to handle scrolling inside the sidebar while keeping height full */}
      <div className="student-sidebar-scroll-area">
        {/* =========================================
            NAVIGATION
        ========================================== */}
        <nav
          className="student-sidebar-nav"
          aria-label="Student navigation"
        >
          {!collapsed && (
            <div className="student-sidebar-nav-heading">
              <span>YOUR SPACE</span>
              <i />
            </div>
          )}

          <div className="student-sidebar-nav-group">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                className={`student-sidebar-nav-item ${isActive(item.href) ? "active" : ""
                  }`}
                title={collapsed ? item.label : undefined}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <span className="student-sidebar-nav-icon">
                  <SidebarIcon name={item.icon} />
                </span>

                {!collapsed && (
                  <span className="student-sidebar-nav-label">
                    {item.label}
                  </span>
                )}

                {item.label === "Notifications" && !collapsed && (
                  <span className="student-sidebar-badge">NEW</span>
                )}
              </Link>
            ))}
          </div>

          {/* =========================================
              LESSONS
          ========================================== */}
          <div className="student-sidebar-section">
            {!collapsed && (
              <div className="student-sidebar-section-label">
                <span>LEARNING JOURNEY</span>
              </div>
            )}

            <button
              type="button"
              className={`student-sidebar-nav-item student-sidebar-expand-btn ${lessonsOpen ? "expanded" : ""
                }`}
              onClick={() =>
                setLessonsOpen(
                  (value) => !value
                )
              }
              title={
                collapsed
                  ? "Lessons"
                  : undefined
              }
              aria-expanded={lessonsOpen}
            >
              <span className="student-sidebar-nav-icon">
                <SidebarIcon name="lessons" />
              </span>

              {!collapsed && (
                <>
                  <span className="student-sidebar-nav-label">
                    Lessons
                  </span>

                  <span
                    className="student-sidebar-chevron"
                    aria-hidden="true"
                  >
                    {lessonsOpen ? "⌄" : "›"}
                  </span>
                </>
              )}
            </button>

            {/* =========================================
                CHAPTERS
            ========================================== */}
            {!collapsed &&
              lessonsOpen && (
                <div className="student-sidebar-submenu">
                  {curriculum.chapters.length ===
                    0 ? (
                    <div className="student-sidebar-empty">
                      No lessons available
                    </div>
                  ) : (
                    curriculum.chapters.map(
                      (chapter) => {
                        const isChapterOpen =
                          Boolean(
                            openChapters[
                            chapter.id
                            ]
                          );

                        const topics =
                          chapter.topics ?? [];

                        const completedCount =
                          topics.filter(
                            (topic) =>
                              completedLessons.includes(
                                topic.id
                              )
                          ).length;

                        return (
                          <div
                            key={chapter.id}
                            className={`student-sidebar-chapter ${isChapterOpen
                                ? "chapter-open"
                                : ""
                              }`}
                          >
                            <button
                              type="button"
                              className="student-sidebar-chapter-btn"
                              onClick={() =>
                                toggleChapter(
                                  chapter.id
                                )
                              }
                              aria-expanded={
                                isChapterOpen
                              }
                            >
                              <span className="student-sidebar-chapter-arrow">
                                {isChapterOpen
                                  ? "⌄"
                                  : "›"}
                              </span>

                              <span className="student-sidebar-chapter-number">
                                {chapter.chapterNumber}
                              </span>

                              <span className="student-sidebar-chapter-info">
                                <span className="student-sidebar-chapter-title">
                                  {chapter.title}
                                </span>

                                <span className="student-sidebar-chapter-meta">
                                  {completedCount}/
                                  {topics.length}{" "}
                                  lessons
                                </span>
                              </span>
                            </button>

                            {isChapterOpen &&
                              topics.length >
                              0 && (
                                <div className="student-sidebar-topic-list">
                                  {topics.map(
                                    (
                                      topic
                                    ) => {
                                      const isActive =
                                        currentLessonId ===
                                        topic.id;

                                      const isCompleted =
                                        completedLessons.includes(
                                          topic.id
                                        );

                                      const isLocked =
                                        topic.status ===
                                        "locked";

                                      return (
                                        <Link
                                          key={
                                            topic.id
                                          }
                                          href={
                                            isLocked
                                              ? "#"
                                              : `/student/lesson/${encodeURIComponent(
                                                topic.id
                                              )}`
                                          }
                                          onClick={(
                                            event
                                          ) => {
                                            if (
                                              isLocked
                                            ) {
                                              event.preventDefault();
                                              return;
                                            }

                                            setActiveLessonId(
                                              topic.id
                                            );
                                          }}
                                          className={`student-sidebar-topic ${isActive
                                              ? "active"
                                              : ""
                                            } ${isCompleted
                                              ? "completed"
                                              : ""
                                            } ${isLocked
                                              ? "locked"
                                              : ""
                                            }`}
                                          title={topic.title}
                                          aria-current={isActive ? "page" : undefined}
                                        >
                                          <span className="student-sidebar-topic-line" />
                                          <span className="student-sidebar-topic-dot">
                                            {isCompleted
                                              ? "✓"
                                              : ""}
                                          </span>
                                          <span className="student-sidebar-topic-title">
                                            {
                                              topic.title
                                            }
                                          </span>

                                          {isActive &&
                                            !isLocked && (
                                              <span className="student-sidebar-topic-current">
                                                Current
                                              </span>
                                            )}

                                          {isLocked && (
                                            <span className="student-sidebar-topic-lock">
                                              <LockIcon />
                                            </span>
                                          )}
                                        </Link>
                                      );
                                    }
                                  )}
                                </div>
                              )}

                            {isChapterOpen &&
                              topics.length ===
                              0 && (
                                <div className="student-sidebar-chapter-empty">
                                  No lessons in this
                                  chapter
                                </div>
                              )}
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              )}
          </div>
        </nav>
      </div>

      {/* =========================================
          CURRENT GRADE (FOOTER)
      ========================================== */}
      {!collapsed && (
        <div className="student-sidebar-footer">
          <div className="student-sidebar-grade-card">
            <span className="student-sidebar-grade-icon">
              <GraduationIcon />
            </span>

            <div>
              <strong>
                {currentGrade?.toUpperCase()}
              </strong>

              <span>
                Current Grade
              </span>
            </div>

            <span className="student-sidebar-grade-count">
              {completedLessons.length} done
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

/* =========================================================
   SIDEBAR HEADER
   ========================================================= */

function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="student-sidebar-header">
      {!collapsed && (
        <Link
          href="/student/dashboard"
          className="student-sidebar-brand"
          aria-label="Student Dashboard"
        >
          <span className="student-sidebar-logo-mark">
            <LogoCube />
          </span>
        </Link>
      )}

      <button
        type="button"
        className="student-sidebar-menu-btn"
        onClick={onToggle}
        aria-label={
          collapsed
            ? "Open sidebar"
            : "Collapse sidebar"
        }
        title={
          collapsed
            ? "Open sidebar"
            : "Collapse sidebar"
        }
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}

/* =========================================================
   SIDEBAR ICONS & OTHER COMPONENTS (Unchanged)
   ========================================================= */

function SidebarIcon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    learning: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
        <path d="M8 7h8M8 10h6" />
      </>
    ),
    courses: (
      <>
        <path d="M4 6.5 12 3l8 3.5L12 10 4 6.5Z" />
        <path d="M6 9.2V15l6 3 6-3V9.2" />
        <path d="M20 7v6" />
      </>
    ),
    assignments: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2.5" />
        <path d="M9 4.5h6M9 9h6M9 13h3M9 17h5" />
        <path d="m15.5 13 1 1 2-2" />
      </>
    ),
    quizzes: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.7 9a2.5 2.5 0 1 1 4.3 1.8c-.9.8-2 1.2-2 2.7" />
        <path d="M12 16.5h.01" />
      </>
    ),
    achievements: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
        <path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4" />
        <path d="M12 13v4M8.5 20h7M10 17h4" />
      </>
    ),
    leaderboard: (
      <>
        <path d="M7 19v-7h4v7M13 19V5h4v14M3 19v-3h4v3" />
        <path d="M3 21h18" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    lessons: (
      <>
        <path d="m4 6 8-3 8 3-8 3-8-3Z" />
        <path d="m4 10 8 3 8-3M4 14l8 3 8-3" />
        <path d="M12 9v8" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5C8 5.57 9.57 4 11.5 4h1C14.43 4 16 5.57 16 7.5V10" />
    </svg>
  );
}

function LogoCube() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 2.8 7.2 4.1v8.2L12 19.2l-7.2-4.1V6.9L12 2.8Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12 2.8 7.2 4.1L12 11 4.8 6.9 12 2.8Z" fill="currentColor" opacity=".2" />
      <path d="M12 11v8.2M4.8 6.9 12 11l7.2-4.1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path d="M7 11v5c2.8 2.2 7.2 2.2 10 0v-5" />
      <path d="M21 10v5" />
    </svg>
  );
}