"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useStudentContext } from "@/context/StudentContext";
import { useAuth } from "@/context/AuthContext";
import "@/styles/profile.css";
import { apiFetch } from "@/lib/api";

// ─── Badges Master Catalogue ──────────────────────────────────────────────────

interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "completion" | "mastery" | "gems";
}

const BADGES_CATALOGUE: BadgeDef[] = [
  {
    id: "b_1",
    title: "Place Value Master",
    description:
      "Completed all Place Value visual and interactive exercises",
    icon: "🏆",
    category: "mastery",
  },
  {
    id: "b_2",
    title: "Streak Champion",
    description: "Maintained a 7-day active daily learning streak",
    icon: "🔥",
    category: "streak",
  },
  {
    id: "b_3",
    title: "First Steps Explorer",
    description: "Completed your very first lesson adventure",
    icon: "🚀",
    category: "completion",
  },
  {
    id: "b_4",
    title: "Quiz Ace",
    description: "Scored 100% in a practice challenge quiz",
    icon: "⭐",
    category: "mastery",
  },
  {
    id: "b_5",
    title: "Gem Collector",
    description: "Accumulated over 100 Learning Gems across activities",
    icon: "💎",
    category: "gems",
  },
  {
    id: "b_6",
    title: "Math Pioneer",
    description: "Completed 5 or more curriculum lessons in your grade",
    icon: "🧠",
    category: "completion",
  },
];

const GRADE_OPTIONS = [
  { value: "grade1", label: "Grade 1 Math" },
  { value: "grade2", label: "Grade 2 Math" },
  { value: "grade3", label: "Grade 3 Math" },
  { value: "grade4", label: "Grade 4 Math" },
  { value: "grade5", label: "Grade 5 Math" },
  { value: "grade6", label: "Grade 6 Math" },
  { value: "grade7", label: "Grade 7 Math" },
  { value: "grade8", label: "Grade 8 Math" },
  { value: "grade9", label: "Grade 9 Math" },
  { value: "grade10", label: "Grade 10 Math" },
  { value: "grade11", label: "Grade 11 Math" },
  { value: "grade12", label: "Grade 12 Math" },
];

export default function StudentProfilePage() {
  const {
    studentName,
    studentEmail,
    currentGrade,
    setCurrentGrade,
    curriculum,
    activeLessonData,
    xpPoints,
    learningGems,
    streakDays,
    completedLessons,
    completedActivities,
    unlockedBadges,
  } = useStudentContext();

  const { user, logout } = useAuth();

  // ── Local State & Modals ────────────────────────────────────────────────────

  const [badgeFilter, setBadgeFilter] = useState<
    "all" | "earned" | "locked"
  >("all");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(
    studentName || user?.name || ""
  );

  const [editGrade, setEditGrade] = useState(currentGrade || "grade1");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync edit form initial values
  useEffect(() => {
    if (studentName && studentName !== "Student Profile") {
      setEditName(studentName);
    } else if (user?.name) {
      setEditName(user.name);
    }

    if (currentGrade) {
      setEditGrade(currentGrade);
    }
  }, [studentName, user, currentGrade]);

  const displayName =
    studentName && studentName !== "Student Profile"
      ? studentName
      : user?.name || "Student Profile";

  const displayEmail =
    studentEmail || user?.email || "student@intellia360.edu";

  // Calculate Level and XP threshold
  const currentLevel = Math.max(1, Math.floor(xpPoints / 250) + 1);
  const nextLevelXp = currentLevel * 250;
  const currentLevelBaseXp = (currentLevel - 1) * 250;

  const levelProgressPct = Math.min(
    100,
    Math.round(
      ((xpPoints - currentLevelBaseXp) / 250) * 100
    )
  );

  // Compute curriculum lessons & progress
  const allCurriculumTopics = useMemo(() => {
    if (!curriculum) return [];

    return curriculum.chapters.flatMap((c) => c.topics);
  }, [curriculum]);

  const totalTopicsCount = allCurriculumTopics.length || 1;
  const completedInGradeCount = completedLessons.length;

  const overallProgressPct = Math.min(
    100,
    Math.round(
      (completedInGradeCount / totalTopicsCount) * 100
    )
  );

  // Compute earned badges
  const earnedBadgeIds = useMemo(() => {
    const ids = new Set<string>(unlockedBadges);

    if (completedLessons.length > 0) {
      ids.add("b_3");
    }

    if (streakDays >= 7) {
      ids.add("b_2");
    }

    if (learningGems >= 100) {
      ids.add("b_5");
    }

    if (completedLessons.length >= 5) {
      ids.add("b_6");
    }

    if (
      completedActivities.some((a) =>
        a.includes("practice")
      )
    ) {
      ids.add("b_4");
    }

    if (completedLessons.length >= 2) {
      ids.add("b_1");
    }

    return ids;
  }, [
    unlockedBadges,
    completedLessons,
    streakDays,
    learningGems,
    completedActivities,
  ]);

  const filteredBadges = useMemo(() => {
    return BADGES_CATALOGUE.filter((b) => {
      const isEarned = earnedBadgeIds.has(b.id);

      if (badgeFilter === "earned") {
        return isEarned;
      }

      if (badgeFilter === "locked") {
        return !isEarned;
      }

      return true;
    });
  }, [badgeFilter, earnedBadgeIds]);

  // Format Grade Label
  const currentGradeLabel =
    GRADE_OPTIONS.find(
      (g) => g.value === currentGrade
    )?.label || currentGrade.toUpperCase();

  // ── Handle Edit Profile Submit ──────────────────────────────────────────────

  const handleSaveProfile = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editName.trim()) {
      setProfileMsg({
        type: "error",
        text: "Display name cannot be empty",
      });

      return;
    }

    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await apiFetch("/api/student/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
          grade: editGrade,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message || "Failed to update profile"
        );
      }

      if (editGrade !== currentGrade) {
        setCurrentGrade(editGrade);
      }

      setProfileMsg({
        type: "success",
        text: "Profile updated successfully!",
      });

      setTimeout(() => {
        setIsEditModalOpen(false);
        setProfileMsg(null);
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred";

      setProfileMsg({
        type: "error",
        text: message,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Handle Change Password Submit ───────────────────────────────────────────

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: "New passwords do not match",
      });

      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 8 characters",
      });

      return;
    }

    setIsSavingPassword(true);
    setPasswordMsg(null);

    try {
      const res = await apiFetch(
        "/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message || "Failed to change password"
        );
      }

      setPasswordMsg({
        type: "success",
        text: "Password changed successfully!",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMsg(null);
      }, 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred";

      setPasswordMsg({
        type: "error",
        text: message,
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="student-profile-container">

      {/* ═════════════════════════════════════════════
          1. GAMIFIED PROFILE HERO
      ═════════════════════════════════════════════ */}

      <div className="sp-header-card">

        {/* Gamified background image */}
        <div className="sp-header-banner">
          <div className="sp-hero-overlay" />
        </div>

        {/* Profile content stays above image */}
        <div className="sp-header-content">

          <div className="sp-user-details-row">

            <div className="sp-avatar-wrapper">
              <img
                src="/assets/avatars/user-student-boy.png"
                alt={displayName}
                className="sp-avatar-img"
                onError={(e) => {
                  (e.target as HTMLElement).style.display =
                    "none";
                }}
              />

              <div className="sp-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="sp-user-info">

              <div className="sp-user-name-row">
                <h1 className="sp-user-name">
                  {displayName}
                </h1>

                <span className="sp-role-badge">
                  🎓 Student
                </span>
              </div>

              <div className="sp-user-meta">

                <span className="sp-meta-item">
                  ✉️ {displayEmail}
                </span>

                <span className="sp-grade-pill">
                  📚 {currentGradeLabel}
                </span>

                <span className="sp-meta-item">
                  ⭐ Level {currentLevel} Explorer
                </span>

              </div>
            </div>
          </div>

          <div className="sp-header-actions">

            <button
              type="button"
              className="sp-btn sp-btn-primary"
              onClick={() => {
                setEditName(displayName);
                setEditGrade(currentGrade);
                setProfileMsg(null);
                setIsEditModalOpen(true);
              }}
            >
              ✏️ Edit Profile
            </button>

            <button
              type="button"
              className="sp-btn sp-btn-secondary"
              onClick={() => {
                setPasswordMsg(null);
                setIsPasswordModalOpen(true);
              }}
            >
              🔒 Security
            </button>

          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          2. LEARNING STATS GRID
      ═════════════════════════════════════════════ */}

      <div className="sp-stats-grid">

        {/* XP Points */}
        <div className="sp-stat-card">
          <div
            className="sp-stat-icon-wrapper"
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              color: "#f59e0b",
            }}
          >
            ⭐
          </div>

          <div className="sp-stat-info">
            <span className="sp-stat-label">
              Total XP
            </span>

            <span className="sp-stat-value">
              {xpPoints.toLocaleString()}
            </span>

            <span className="sp-stat-sub">
              Level {currentLevel} ({levelProgressPct}% to
              Lv {currentLevel + 1})
            </span>
          </div>
        </div>

        {/* Learning Gems */}
        <div className="sp-stat-card">
          <div
            className="sp-stat-icon-wrapper"
            style={{
              background: "rgba(59, 130, 246, 0.12)",
              color: "#3b82f6",
            }}
          >
            💎
          </div>

          <div className="sp-stat-info">
            <span className="sp-stat-label">
              Learning Gems
            </span>

            <span className="sp-stat-value">
              {learningGems.toLocaleString()}
            </span>

            <span className="sp-stat-sub">
              Redeemable in Rewards
            </span>
          </div>
        </div>

        {/* Streak Days */}
        <div className="sp-stat-card">
          <div
            className="sp-stat-icon-wrapper"
            style={{
              background: "rgba(249, 115, 22, 0.12)",
              color: "#f97316",
            }}
          >
            🔥
          </div>

          <div className="sp-stat-info">
            <span className="sp-stat-label">
              Daily Streak
            </span>

            <span className="sp-stat-value">
              {streakDays}{" "}
              {streakDays === 1 ? "Day" : "Days"}
            </span>

            <span className="sp-stat-sub">
              Active Learning Streak
            </span>
          </div>
        </div>

        {/* Completed Lessons */}
        <div className="sp-stat-card">
          <div
            className="sp-stat-icon-wrapper"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
            }}
          >
            🎯
          </div>

          <div className="sp-stat-info">
            <span className="sp-stat-label">
              Lessons Done
            </span>

            <span className="sp-stat-value">
              {completedInGradeCount}
            </span>

            <span className="sp-stat-sub">
              {totalTopicsCount} Available in Grade
            </span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          3. MAIN CONTENT GRID
      ═════════════════════════════════════════════ */}

      <div className="sp-main-grid">

        {/* ── Left Column ── */}
        <div className="sp-grid-col">

          {/* Learning Progress */}
          <div className="sp-panel">

            <div className="sp-panel-header">

              <span className="sp-panel-title">
                <span className="sp-panel-title-icon">
                  📊
                </span>

                Learning Progress — {currentGradeLabel}
              </span>

              <Link
                href="/student/dashboard"
                className="sp-panel-badge"
                style={{
                  textDecoration: "none",
                }}
              >
                Go to Dashboard →
              </Link>

            </div>

            <div className="sp-panel-body">

              <div className="sp-progress-overview">

                <div className="sp-progress-top">

                  <div className="sp-progress-title-block">

                    <span className="sp-progress-grade-tag">
                      Current Adventure Topic
                    </span>

                    <span className="sp-progress-lesson-title">
                      {activeLessonData?.title ||
                        "Counting numbers up to 100"}
                    </span>

                  </div>

                  <div className="sp-progress-pct-badge">
                    {overallProgressPct}%
                  </div>

                </div>

                <div className="sp-progress-bar-bg">
                  <div
                    className="sp-progress-bar-fill"
                    style={{
                      width: `${overallProgressPct}%`,
                    }}
                  />
                </div>

                <div className="sp-progress-meta-row">
                  <span>
                    {completedInGradeCount} of{" "}
                    {totalTopicsCount} lessons completed
                  </span>

                  <span>
                    {totalTopicsCount -
                      completedInGradeCount}{" "}
                    lessons remaining
                  </span>
                </div>

              </div>

              {/* Chapters */}
              {curriculum &&
                curriculum.chapters && (
                  <div className="sp-chapters-list">

                    {curriculum.chapters
                      .slice(0, 4)
                      .map((ch, idx) => {

                        const chapterCompletedCount =
                          ch.topics.filter((t) =>
                            completedLessons.includes(
                              t.id
                            )
                          ).length;

                        const isFullyDone =
                          chapterCompletedCount ===
                          ch.topics.length &&
                          ch.topics.length > 0;

                        return (
                          <div
                            key={ch.id || idx}
                            className="sp-chapter-item"
                          >

                            <div className="sp-chapter-left">

                              <span className="sp-chapter-icon">
                                {isFullyDone
                                  ? "✅"
                                  : "📖"}
                              </span>

                              <span className="sp-chapter-title">
                                Chapter{" "}
                                {ch.chapterNumber}:{" "}
                                {ch.title}
                              </span>

                            </div>

                            <span className="sp-chapter-badge">
                              {chapterCompletedCount} /{" "}
                              {ch.topics.length} done
                            </span>

                          </div>
                        );
                      })}

                  </div>
                )}

            </div>
          </div>

          {/* Achievements */}
          <div className="sp-panel">

            <div className="sp-panel-header">

              <span className="sp-panel-title">
                <span className="sp-panel-title-icon">
                  🏆
                </span>

                Achievements & Badges
              </span>

              <span className="sp-panel-badge">
                {earnedBadgeIds.size} /{" "}
                {BADGES_CATALOGUE.length} Unlocked
              </span>

            </div>

            <div className="sp-panel-body">

              <div className="sp-badge-filter-bar">

                <button
                  type="button"
                  className={`sp-filter-btn ${badgeFilter === "all"
                      ? "active"
                      : ""
                    }`}
                  onClick={() =>
                    setBadgeFilter("all")
                  }
                >
                  All ({BADGES_CATALOGUE.length})
                </button>

                <button
                  type="button"
                  className={`sp-filter-btn ${badgeFilter === "earned"
                      ? "active"
                      : ""
                    }`}
                  onClick={() =>
                    setBadgeFilter("earned")
                  }
                >
                  Earned ({earnedBadgeIds.size})
                </button>

                <button
                  type="button"
                  className={`sp-filter-btn ${badgeFilter === "locked"
                      ? "active"
                      : ""
                    }`}
                  onClick={() =>
                    setBadgeFilter("locked")
                  }
                >
                  Locked (
                  {BADGES_CATALOGUE.length -
                    earnedBadgeIds.size}
                  )
                </button>

              </div>

              <div className="sp-badges-grid">

                {filteredBadges.map((badge) => {

                  const isEarned =
                    earnedBadgeIds.has(badge.id);

                  return (
                    <div
                      key={badge.id}
                      className={`sp-badge-card ${isEarned
                          ? "unlocked"
                          : "locked"
                        }`}
                    >

                      <div className="sp-badge-icon">
                        {badge.icon}
                      </div>

                      <div className="sp-badge-title">
                        {badge.title}
                      </div>

                      <div className="sp-badge-desc">
                        {badge.description}
                      </div>

                      <span
                        className={`sp-badge-status ${isEarned
                            ? "earned"
                            : "locked-tag"
                          }`}
                      >
                        {isEarned
                          ? "✓ Unlocked"
                          : "🔒 Locked"}
                      </span>

                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="sp-grid-col">

          {/* Recent Activity */}
          <div className="sp-panel">

            <div className="sp-panel-header">

              <span className="sp-panel-title">
                <span className="sp-panel-title-icon">
                  ⚡
                </span>

                Recent Activity
              </span>

              <span className="sp-panel-badge">
                Live
              </span>

            </div>

            <div className="sp-panel-body">

              <div className="sp-activity-list">

                {completedLessons.length === 0 &&
                  completedActivities.length === 0 ? (

                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px 0",
                      color: "#9ca3af",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.8rem",
                        marginBottom: 6,
                      }}
                    >
                      🎯
                    </div>

                    No activities recorded yet.
                    Start today&apos;s adventure!
                  </div>

                ) : (

                  <>
                    {completedLessons
                      .slice(-3)
                      .map((lessonId, idx) => {

                        const topic =
                          allCurriculumTopics.find(
                            (t) => t.id === lessonId
                          );

                        return (
                          <div
                            key={`lesson_${lessonId}_${idx}`}
                            className="sp-activity-item"
                          >

                            <div className="sp-activity-left">

                              <div
                                className="sp-activity-icon"
                                style={{
                                  background:
                                    "rgba(16, 185, 129, 0.12)",
                                  color: "#10b981",
                                }}
                              >
                                ✓
                              </div>

                              <div className="sp-activity-texts">

                                <span className="sp-activity-name">
                                  {topic
                                    ? topic.title
                                    : `Completed: ${lessonId}`}
                                </span>

                                <span className="sp-activity-date">
                                  Lesson Completed
                                </span>

                              </div>
                            </div>

                            <div className="sp-activity-right">
                              <span className="sp-xp-chip">
                                +50 XP
                              </span>
                            </div>

                          </div>
                        );
                      })}

                    {completedActivities
                      .slice(-3)
                      .map((actKey, idx) => {

                        const [lId, aType] =
                          actKey.split("_");

                        const typeLabel =
                          aType === "architecture"
                            ? "Architecture"
                            : aType === "practice"
                              ? "Quiz Practice"
                              : aType === "video"
                                ? "Video Lesson"
                                : "EduNotes";

                        return (
                          <div
                            key={`act_${actKey}_${idx}`}
                            className="sp-activity-item"
                          >

                            <div className="sp-activity-left">

                              <div
                                className="sp-activity-icon"
                                style={{
                                  background:
                                    "rgba(59, 130, 246, 0.12)",
                                  color: "#3b82f6",
                                }}
                              >
                                🎮
                              </div>

                              <div className="sp-activity-texts">

                                <span className="sp-activity-name">
                                  {typeLabel}
                                </span>

                                <span className="sp-activity-date">
                                  Topic: {lId}
                                </span>

                              </div>
                            </div>

                            <div className="sp-activity-right">
                              <span className="sp-xp-chip">
                                +20 XP
                              </span>
                            </div>

                          </div>
                        );
                      })}
                  </>
                )}

              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="sp-panel">

            <div className="sp-panel-header">

              <span className="sp-panel-title">
                <span className="sp-panel-title-icon">
                  ⚙️
                </span>

                Account Settings
              </span>

            </div>

            <div className="sp-panel-body">

              <div className="sp-settings-list">

                <div className="sp-setting-row">

                  <div className="sp-setting-label-block">

                    <span className="sp-setting-label">
                      Profile Information
                    </span>

                    <span className="sp-setting-desc">
                      Update your name & active grade
                    </span>

                  </div>

                  <button
                    type="button"
                    className="sp-btn sp-btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => {
                      setEditName(displayName);
                      setEditGrade(currentGrade);
                      setProfileMsg(null);
                      setIsEditModalOpen(true);
                    }}
                  >
                    Edit
                  </button>

                </div>

                <div className="sp-setting-row">

                  <div className="sp-setting-label-block">

                    <span className="sp-setting-label">
                      Security & Password
                    </span>

                    <span className="sp-setting-desc">
                      Change your login password
                    </span>

                  </div>

                  <button
                    type="button"
                    className="sp-btn sp-btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                    }}
                    onClick={() => {
                      setPasswordMsg(null);
                      setIsPasswordModalOpen(true);
                    }}
                  >
                    Change
                  </button>

                </div>

                <div className="sp-setting-row">

                  <div className="sp-setting-label-block">

                    <span
                      className="sp-setting-label"
                      style={{
                        color: "#dc2626",
                      }}
                    >
                      Sign Out
                    </span>

                    <span className="sp-setting-desc">
                      Log out of this session
                    </span>

                  </div>

                  <button
                    type="button"
                    className="sp-btn sp-btn-danger-outline"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                    }}
                    onClick={async () => {
                      await logout();
                    }}
                  >
                    Logout
                  </button>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          EDIT PROFILE MODAL
      ═════════════════════════════════════════════ */}

      {isEditModalOpen && (
        <div
          className="sp-modal-overlay"
          onClick={() =>
            setIsEditModalOpen(false)
          }
        >
          <div
            className="sp-modal-box"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="sp-modal-header">

              <h3 className="sp-modal-title">
                ✏️ Edit Student Profile
              </h3>

              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() =>
                  setIsEditModalOpen(false)
                }
              >
                ✕
              </button>

            </div>

            <form onSubmit={handleSaveProfile}>

              <div className="sp-modal-body">

                {profileMsg && (
                  <div
                    className={`sp-alert ${profileMsg.type === "success"
                        ? "sp-alert-success"
                        : "sp-alert-error"
                      }`}
                  >
                    {profileMsg.text}
                  </div>
                )}

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    Student Display Name
                  </label>

                  <input
                    type="text"
                    className="sp-form-input"
                    value={editName}
                    onChange={(e) =>
                      setEditName(e.target.value)
                    }
                    placeholder="Enter student full name"
                    required
                  />

                </div>

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    Current Grade / Curriculum
                  </label>

                  <select
                    className="sp-form-select"
                    value={editGrade}
                    onChange={(e) =>
                      setEditGrade(e.target.value)
                    }
                  >
                    {GRADE_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>

                </div>

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    Registered Email
                  </label>

                  <input
                    type="email"
                    className="sp-form-input"
                    value={displayEmail}
                    disabled
                    style={{
                      background: "#f3f4f6",
                      color: "#9ca3af",
                      cursor: "not-allowed",
                    }}
                  />

                </div>

              </div>

              <div className="sp-modal-footer">

                <button
                  type="button"
                  className="sp-btn sp-btn-secondary"
                  onClick={() =>
                    setIsEditModalOpen(false)
                  }
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-btn sp-btn-primary"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════
          CHANGE PASSWORD MODAL
      ═════════════════════════════════════════════ */}

      {isPasswordModalOpen && (
        <div
          className="sp-modal-overlay"
          onClick={() =>
            setIsPasswordModalOpen(false)
          }
        >
          <div
            className="sp-modal-box"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="sp-modal-header">

              <h3 className="sp-modal-title">
                🔒 Change Password
              </h3>

              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() =>
                  setIsPasswordModalOpen(false)
                }
              >
                ✕
              </button>

            </div>

            <form onSubmit={handleChangePassword}>

              <div className="sp-modal-body">

                {passwordMsg && (
                  <div
                    className={`sp-alert ${passwordMsg.type === "success"
                        ? "sp-alert-success"
                        : "sp-alert-error"
                      }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    Current Password
                  </label>

                  <input
                    type="password"
                    className="sp-form-input"
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    required
                  />

                </div>

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    New Password (Min 8 chars)
                  </label>

                  <input
                    type="password"
                    className="sp-form-input"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />

                </div>

                <div className="sp-form-group">

                  <label className="sp-form-label">
                    Confirm New Password
                  </label>

                  <input
                    type="password"
                    className="sp-form-input"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />

                </div>

              </div>

              <div className="sp-modal-footer">

                <button
                  type="button"
                  className="sp-btn sp-btn-secondary"
                  onClick={() =>
                    setIsPasswordModalOpen(false)
                  }
                  disabled={isSavingPassword}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sp-btn sp-btn-primary"
                  disabled={isSavingPassword}
                >
                  {isSavingPassword
                    ? "Updating Password..."
                    : "Update Password"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}