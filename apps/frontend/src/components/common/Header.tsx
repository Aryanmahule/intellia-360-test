"use client";

import React from "react";
import { useStudentContext } from "@/context/StudentContext";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";
import GradeSelector from "./GradeSelector";
import LevelProgress from "./LevelProgress";
import StreakBadge from "./StreakBadge";
import GemsBadge from "./GemsBadge";
import XPBadge from "./XPBadge";
import NotificationButton from "./NotificationButton";
import ProfileMenu from "./ProfileMenu";

export default function Header() {
  const {
    xpPoints,
    learningGems,
    streakDays,
    currentGrade,
    setCurrentGrade,
    studentName,
  } = useStudentContext();

  const { user } = useAuth();

  const displayName =
    studentName && studentName !== "Student Profile"
      ? studentName
      : user?.name || "Student Profile";

  /*
   * Keep these as safe fallback values.
   * Header should not crash if profile data is unavailable.
   */
  const profile = {
    name: displayName,
    avatar: "/assets/avatars/user-student-boy.png",
    levelTitle: "Level",
    level: 1,
    levelProgress: 0,
  };

  return (
    <header className="header-container">

      {/* ═════════════════════════════════════════════
          HEADER LEFT
      ═════════════════════════════════════════════ */}

      <div className="header-left">
        <Logo />

        <div className="header-user-summary">
          <div className="header-grade-level">
            <GradeSelector
              currentGrade={currentGrade}
              onChangeGrade={setCurrentGrade}
            />

            <LevelProgress
              levelTitle={profile.levelTitle}
              levelNumber={profile.level}
              progressPercentage={profile.levelProgress}
            />
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          HEADER RIGHT

          🔥 Streak
          💎 Gems
          ⭐ XP
          🔔 Notification
          👤 Profile
      ═════════════════════════════════════════════ */}

      <div className="header-right">
        <StreakBadge
          streakDays={streakDays}
        />

        <GemsBadge
          learningGems={learningGems}
        />

        <XPBadge
          xpPoints={xpPoints}
        />

        <NotificationButton />

        <ProfileMenu
          avatarUrl={profile.avatar}
          studentName={displayName}
        />
      </div>

    </header>
  );
}
