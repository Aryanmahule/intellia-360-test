"use client";

import Link from "next/link";
import { useStudentContext } from "@/context/StudentContext";
import HeroSectionContainer from "@/components/student/HeroSectionContainer";
import type { DashboardHeroSlide } from "@intellia360/shared/types/student";
import BottomNavigationContainer from "@/components/student/BottomNavigationContainer";
import "./dashboard.css";

function StatCard({
  icon,
  label,
  value,
  change,
  iconBg,
}: {
  icon: string;
  label: string;
  value: string;
  change: string;
  iconBg: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8edf5",
        borderRadius: 16,
        padding: "18px 18px 14px",
        minWidth: 0,
        boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: iconBg,
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1,
              color: "#172554",
              fontWeight: 800,
            }}
          >
            {value}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "#16a34a",
          fontWeight: 700,
        }}
      >
        ↑ {change}
      </div>
    </div>
  );
}

function ResourceCard({
  icon,
  title,
  description,
  buttonText,
  href,
  background,
  iconBackground,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  background: string;
  iconBackground: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        minHeight: 190,
        background,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.10)",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: "rgba(255,255,255,.10)",
          right: -35,
          top: -35,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            display: "grid",
            placeItems: "center",
            background: iconBackground,
            fontSize: 27,
            marginBottom: 13,
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "7px 0 0",
            fontSize: 12,
            lineHeight: 1.5,
            color: "rgba(255,255,255,.88)",
            maxWidth: 230,
          }}
        >
          {description}
        </p>
      </div>

      <Link
        href={href}
        onClick={onClick}
        style={{
          position: "relative",
          zIndex: 1,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          marginTop: 16,
          padding: "9px 13px",
          borderRadius: 999,
          background: "#fff",
          color: "#172554",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {buttonText} →
      </Link>
    </div>
  );
}

function ProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const safeTotal = Math.max(total, 1);
  const percentage = Math.min(100, Math.round((completed / safeTotal) * 100));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 125, height: 125, flexShrink: 0 }}>
      <svg width="125" height="125" viewBox="0 0 125 125">
        <circle
          cx="62.5"
          cy="62.5"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="13"
        />
        <circle
          cx="62.5"
          cy="62.5"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 62.5 62.5)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <strong style={{ fontSize: 22, color: "#172554" }}>{completed}</strong>
        <span style={{ fontSize: 10, color: "#64748b" }}>Completed</span>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const {
    activeLessonData,
    goToNextLesson,
    goToPrevLesson,
    completeActivity,
    isActivityCompleted,
    xpPoints,
    learningGems,
    streakDays,
    completedLessons,
    curriculum,
  } = useStudentContext();

  if (!activeLessonData) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontSize: 14,
        }}
      >
        Loading dashboard…
      </div>
    );
  }

  const actionCards = activeLessonData.actionCards ?? {};

  const architectureUrl = `/student/lesson/${encodeURIComponent(
    activeLessonData.id
  )}`;

  const edunotesUrl = `/student/lesson/edunotes?lessonId=${encodeURIComponent(
    activeLessonData.id
  )}`;

  const practiceUrl =
    actionCards.practice ?? "/student/quiz/practice-1";

  // Always open the in-app video page for this topic. It resolves the
  // lesson videos server-side and ignores the placeholder clip that the
  // seed curriculum still carries for many topics.
  const videoUrl =
    "/student/lesson/video?lessonId=" +
    encodeURIComponent(activeLessonData.id);

  const isArchCompleted = isActivityCompleted(
    activeLessonData.id,
    "architecture"
  );
  const isPracticeCompleted = isActivityCompleted(
    activeLessonData.id,
    "practice"
  );
  const isEdunotesCompleted = isActivityCompleted(
    activeLessonData.id,
    "edunotes"
  );
  const isVideoCompleted = isActivityCompleted(
    activeLessonData.id,
    "video"
  );

  const isLessonCompleted = completedLessons.includes(activeLessonData.id);

  const xpAward = activeLessonData.xpReward ?? 50;
  const gemAward = activeLessonData.gemsReward ?? 5;

  const completedCount = [
    isArchCompleted,
    isPracticeCompleted,
    isEdunotesCompleted,
    isVideoCompleted,
  ].filter(Boolean).length;

  const completionPct = Math.round((completedCount / 4) * 100);

  const totalTopics =
    curriculum?.chapters.reduce(
      (total, chapter) => total + chapter.topics.length,
      0
    ) ?? 0;

  const currentLessonCompletedTopics =
    curriculum?.chapters.reduce(
      (total, chapter) =>
        total +
        chapter.topics.filter((topic) =>
          completedLessons.includes(topic.id)
        ).length,
      0
    ) ?? completedLessons.length;

  const heroSlides: DashboardHeroSlide[] = [
    {
      tag: activeLessonData.heroSlide?.tag || "Today's Adventure",
      title: activeLessonData.title,
      subtitle:
        activeLessonData.heroSlide?.subtitle ||
        `Dive into ${activeLessonData.title}! Discover core concepts through interactive visuals and step-by-step guided learning designed just for you.`,
      ctaText: isArchCompleted ? "Continue Learning →" : "Start Learning →",
      ctaUrl: architectureUrl,
      visualizerKey:
        activeLessonData.heroSlide?.visualizerKey || activeLessonData.id,
      visualizerData:
        activeLessonData.heroSlide?.visualizerData || { number: 123 },
      activityType: "architecture",
      xpReward: xpAward,
      gemsReward: gemAward,
    },
    {
      tag: "Story & Interactive Simulation",
      title: "Learn Visually",
      subtitle:
        "Understand concepts through interactive 3D models, stories, examples and guided exploration.",
      ctaText: isArchCompleted
        ? "Open 3D Architecture ✓"
        : "Explore Architecture 3D",
      ctaUrl: architectureUrl,
      visualizerKey: "symmetry",
      visualizerData:
        activeLessonData.heroSlide?.visualizerData || { number: 246 },
      activityType: "architecture",
      xpReward: xpAward,
      gemsReward: gemAward,
    },
    {
      tag: "Practice Challenge",
      title: "Practice & Improve",
      subtitle:
        "Test your knowledge with interactive questions, instant feedback and reward-based practice.",
      ctaText: isPracticeCompleted
        ? "Practice Again ✓"
        : "Start Practice (+30 XP)",
      ctaUrl: practiceUrl,
      visualizerKey: "fraction",
      visualizerData: { number: 456 },
      activityType: "practice",
      xpReward: 30,
      gemsReward: 0,
    },
    {
      tag: "Reflection & Achievement",
      title: "Review Your Learning",
      subtitle: `You have completed ${completedCount} of 4 activities for this lesson. Keep learning and build your streak!`,
      ctaText: isEdunotesCompleted ? "Open EduNotes ✓" : "Open EduNotes",
      ctaUrl: edunotesUrl,
      visualizerKey: "time",
      visualizerData: { number: 789 },
      activityType: "edunotes",
      xpReward: 20,
      gemsReward: 0,
    },
  ];

  const handleHeroCtaClick = (slide: DashboardHeroSlide) => {
    if (!slide.activityType) return;

    completeActivity(
      activeLessonData.id,
      slide.activityType,
      slide.xpReward || 0,
      slide.gemsReward || 0
    );
  };

  const handleResourceClick = (
    activityType: string,
    xpReward: number,
    gemsReward: number
  ) => {
    completeActivity(
      activeLessonData.id,
      activityType,
      xpReward,
      gemsReward
    );
  };

  const upcomingActivities = [
    {
      icon: "⭐",
      title: `Complete ${activeLessonData.title}`,
      subtitle: isLessonCompleted
        ? "Lesson completed"
        : `${completedCount}/4 activities completed`,
      href: architectureUrl,
      action: isLessonCompleted ? "Review" : "Start",
    },
    {
      icon: "🎯",
      title: "Practice Challenge",
      subtitle: isPracticeCompleted
        ? "Completed"
        : "Interactive exercises",
      href: practiceUrl,
      action: isPracticeCompleted ? "Retry" : "Start",
    },
    {
      icon: "▶️",
      title: "Watch Lesson Video",
      subtitle: isVideoCompleted ? "Completed" : "Learn with video",
      href: videoUrl,
      action: isVideoCompleted ? "Watch" : "Watch",
    },
  ];

  const achievements = [
    {
      icon: "🔥",
      title: `${streakDays}-Day Streak`,
      subtitle: streakDays > 0 ? "Keep the streak alive!" : "Start your streak today",
    },
    {
      icon: "⭐",
      title: `${xpPoints.toLocaleString()} XP`,
      subtitle: "Total learning XP",
    },
    {
      icon: "💎",
      title: `${learningGems} Gems`,
      subtitle: "Learning rewards collected",
    },
  ];

  return (
    <div
      className="student-dashboard-page"
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 18px 32px",
        boxSizing: "border-box",
      }}
    >
      {/* 1. Hero */}
      <HeroSectionContainer
        slides={heroSlides}
        activeLessonId={activeLessonData.id}
        onCtaClick={handleHeroCtaClick}
      />

      {/* 2. Key student stats */}
      <section
        className="student-dashboard-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <StatCard
          icon="⭐"
          label="XP Points"
          value={xpPoints.toLocaleString()}
          change="Keep learning"
          iconBg="#fff3c4"
        />
        <StatCard
          icon="💎"
          label="Learning Gems"
          value={String(learningGems)}
          change="Rewards collected"
          iconBg="#efe4ff"
        />
        <StatCard
          icon="🔥"
          label="Day Streak"
          value={`${streakDays}`}
          change="Consecutive days"
          iconBg="#ffe8dc"
        />
        <StatCard
          icon="✓"
          label="Lessons Completed"
          value={String(completedLessons.length)}
          change={`${totalTopics || 0} topics available`}
          iconBg="#dcfce7"
        />
      </section>

      {/* 3. Continue learning + progress */}
      <section
        className="student-dashboard-progress-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, .75fr)",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8edf5",
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#172554",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Continue Learning
            </h2>
            <span
              style={{
                fontSize: 12,
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              {completionPct}% activities complete
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px minmax(0, 1fr)",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #ede9fe 100%)",
                fontSize: 48,
              }}
            >
              🪐
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 5,
                }}
              >
                Current Lesson
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#172554",
                  fontSize: 21,
                  fontWeight: 800,
                }}
              >
                {activeLessonData.title}
              </h3>

              <p
                style={{
                  margin: "7px 0 12px",
                  color: "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {isLessonCompleted
                  ? "Great work! You completed this lesson."
                  : "Continue the lesson and explore the learning resources below."}
              </p>

              <div
                style={{
                  height: 9,
                  borderRadius: 999,
                  background: "#e8eef7",
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: `${completionPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #2563eb, #7c3aed)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {completedCount}/4 activities
                </span>

                <Link
                  href={architectureUrl}
                  onClick={() =>
                    handleResourceClick(
                      "architecture",
                      xpAward,
                      gemAward
                    )
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 15px",
                    borderRadius: 999,
                    background: "#2563eb",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Continue Lesson →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e8edf5",
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#172554",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Learning Progress
            </h2>
            <Link
              href="/student/courses"
              style={{
                color: "#2563eb",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View All
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <ProgressRing
              completed={currentLessonCompletedTopics}
              total={totalTopics}
            />

            <div style={{ display: "grid", gap: 12, flex: 1 }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#475569",
                    marginBottom: 5,
                  }}
                >
                  <span>Completed</span>
                  <strong>{currentLessonCompletedTopics}</strong>
                </div>
                <div
                  style={{
                    height: 7,
                    background: "#dcfce7",
                    borderRadius: 99,
                  }}
                >
                  <div
                    style={{
                      width: `${totalTopics
                        ? Math.min(
                          100,
                          Math.round(
                            (currentLessonCompletedTopics /
                              totalTopics) *
                            100
                          )
                        )
                        : 0
                        }%`,
                      height: "100%",
                      borderRadius: 99,
                      background: "#10b981",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                {totalTopics
                  ? `${totalTopics - currentLessonCompletedTopics} topics remaining in the curriculum.`
                  : "Your curriculum is loading."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Most important area: Architecture / Video / EduNotes / Practice */}
      <section
        className="student-dashboard-learning-hub"
        style={{
          marginTop: 18,
          background: "#fff",
          border: "1px solid #e8edf5",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#2563eb",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 5,
              }}
            >
              Learning Hub
            </div>
            <h2
              style={{
                margin: 0,
                color: "#172554",
                fontSize: 22,
                fontWeight: 850,
              }}
            >
              Learning Tools & Resources
            </h2>
            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Everything you need for {activeLessonData.title} in one place.
            </p>
          </div>

          <span
            style={{
              padding: "7px 11px",
              borderRadius: 999,
              background: "#eff6ff",
              color: "#2563eb",
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {completedCount}/4 completed
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <ResourceCard
            icon="🧊"
            title="Architecture 3D"
            description="Explore interactive 3D models and visual concept breakdowns."
            buttonText={
              isArchCompleted ? "Open 3D Viewer ✓" : "Open 3D Viewer"
            }
            href={architectureUrl}
            background="linear-gradient(135deg, #1687f7 0%, #2563eb 55%, #4f46e5 100%)"
            iconBackground="rgba(255,255,255,.16)"
            onClick={() =>
              handleResourceClick("architecture", xpAward, gemAward)
            }
          />

          <ResourceCard
            icon="▶️"
            title="Video Lessons"
            description="Watch engaging concept videos and learn through visual examples."
            buttonText="Watch Video"
            href={videoUrl}
            background="linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)"
            iconBackground="rgba(255,255,255,.16)"
            onClick={() => handleResourceClick("video", 20, 5)}
          />

          <ResourceCard
            icon="📖"
            title="EduNotes"
            description="Read clear notes, key points, summaries and lesson explanations."
            buttonText={
              isEdunotesCompleted ? "Open EduNotes ✓" : "Open EduNotes"
            }
            href={edunotesUrl}
            background="linear-gradient(135deg, #0f9f7a 0%, #10b981 50%, #14b8a6 100%)"
            iconBackground="rgba(255,255,255,.16)"
            onClick={() => handleResourceClick("edunotes", 20, 0)}
          />

          <ResourceCard
            icon="🎯"
            title="Practice"
            description="Solve interactive questions, get instant feedback and improve skills."
            buttonText={
              isPracticeCompleted ? "Practice Again ✓" : "Start Practice"
            }
            href={practiceUrl}
            background="linear-gradient(135deg, #f97316 0%, #fb923c 55%, #f59e0b 100%)"
            iconBackground="rgba(255,255,255,.16)"
            onClick={() => handleResourceClick("practice", 30, 0)}
          />
        </div>
      </section>

      {/* 5. Upcoming activities + achievements + learning summary */}
      <section
        className="student-dashboard-bottom-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.05fr) minmax(0, .95fr) minmax(0, .95fr)",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8edf5",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#172554",
                fontWeight: 800,
              }}
            >
              Upcoming Activities
            </h2>
            <Link
              href="/student/assignments"
              style={{
                fontSize: 11,
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View All
            </Link>
          </div>

          <div style={{ display: "grid", gap: 9 }}>
            {upcomingActivities.map((activity) => (
              <Link
                key={activity.title}
                href={activity.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 8px",
                  borderBottom: "1px solid #eef2f7",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "#eff6ff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {activity.icon}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: "#1e293b",
                      fontSize: 12,
                      fontWeight: 750,
                    }}
                  >
                    {activity.title}
                  </div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    {activity.subtitle}
                  </div>
                </div>

                <span
                  style={{
                    border: "1px solid #bfdbfe",
                    color: "#2563eb",
                    borderRadius: 999,
                    padding: "5px 9px",
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity.action}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e8edf5",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 4px 18px rgba(31, 41, 55, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                color: "#172554",
                fontWeight: 800,
              }}
            >
              Recent Achievements
            </h2>
            <Link
              href="/student/rewards"
              style={{
                fontSize: 11,
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              View All
            </Link>
          </div>

          <div style={{ display: "grid", gap: 11 }}>
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 0",
                  borderBottom: "1px solid #eef2f7",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff7ed",
                    fontSize: 21,
                  }}
                >
                  {achievement.icon}
                </div>

                <div>
                  <div
                    style={{
                      color: "#1e293b",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {achievement.title}
                  </div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    {achievement.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background:
              "linear-gradient(145deg, #eff6ff 0%, #f5f3ff 100%)",
            border: "1px solid #dbeafe",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 4px 18px rgba(31, 41, 55, 0.04)",
          }}
        >
          <h2
            style={{
              margin: "0 0 5px",
              fontSize: 17,
              color: "#172554",
              fontWeight: 800,
            }}
          >
            Your Learning Summary
          </h2>

          <p
            style={{
              margin: "0 0 16px",
              color: "#64748b",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            A quick snapshot of your current learning journey.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>Current lesson</span>
              <strong
                style={{
                  color: "#172554",
                  maxWidth: 145,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeLessonData.title}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>Activities</span>
              <strong style={{ color: "#172554" }}>
                {completedCount}/4
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>XP earned</span>
              <strong style={{ color: "#172554" }}>
                {xpPoints.toLocaleString()}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>Learning gems</span>
              <strong style={{ color: "#172554" }}>{learningGems}</strong>
            </div>

            <Link
              href="/student/courses"
              style={{
                marginTop: 5,
                textAlign: "center",
                padding: "9px 12px",
                borderRadius: 10,
                background: "#fff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              Open Full Progress
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Keep lesson navigation functionality */}
      <div style={{ marginTop: 18 }}>
        <BottomNavigationContainer
          onPrevious={goToPrevLesson}
          onNext={goToNextLesson}
        />
      </div>
    </div>
  );
}
