"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStudentContext } from "@/context/StudentContext";
import { useAuth } from "@/context/AuthContext";
import type { LeaderboardEntry, LeaderboardResponse, CurrentUserStats } from "@intellia360/shared/types/api/leaderboard";
import "./leaderboard.css";
import { apiFetch } from "@/lib/api";

const GRADE_OPTIONS = [
  { value: "", label: "All Grades" },
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

export default function LeaderboardPage() {
  const { currentGrade: studentContextGrade, studentName, xpPoints: ctxXp, streakDays: ctxStreak, learningGems: ctxGems } = useStudentContext();
  const { user } = useAuth();

  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all_time">("all_time");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserStats, setCurrentUserStats] = useState<CurrentUserStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (gradeFilter: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = gradeFilter
        ? `/api/student/leaderboard?grade=${encodeURIComponent(gradeFilter)}&limit=50`
        : `/api/student/leaderboard?limit=50`;

      const response = await apiFetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load leaderboard (${response.status})`);
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || "Failed to load leaderboard data");
      }

      const data: LeaderboardResponse = json.data;
      setEntries(data.entries || []);
      setCurrentUserStats(data.currentUserStats || null);
    } catch (err: unknown) {
      console.error("[LeaderboardPage]", err);
      const message = err instanceof Error ? err.message : "Failed to load leaderboard";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(selectedGrade);
  }, [fetchLeaderboard, selectedGrade]);

  const displayName =
    studentName && studentName !== "Student Profile"
      ? studentName
      : user?.name || "Student";

  const userRankDisplay = currentUserStats?.rank
    ? `#${currentUserStats.rank}`
    : "—";

  const userXpDisplay =
    currentUserStats?.xpPoints !== undefined
      ? currentUserStats.xpPoints
      : ctxXp;

  const userStreakDisplay =
    currentUserStats?.streakDays !== undefined
      ? currentUserStats.streakDays
      : ctxStreak;

  const userGemsDisplay =
    currentUserStats?.learningGems !== undefined
      ? currentUserStats.learningGems
      : ctxGems;

  const topThree = entries.slice(0, 3);

  return (
    <div className="student-leaderboard-container">
      {/* ═════════════════════════════════════════════
          1. HEADER CARD
      ═════════════════════════════════════════════ */}
      <div className="sl-header-card">
        <div className="sl-header-left">
          <div className="sl-title-row">
            <h1 className="sl-page-title">Leaderboard</h1>
            <span className="sl-badge-pill">🏆 Live Rankings</span>
          </div>
          <p className="sl-page-subtitle">
            Real-time student rankings based on earned XP and learning achievements
          </p>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          2. CURRENT STUDENT HIGHLIGHT BANNER
      ═════════════════════════════════════════════ */}
      <div className="sl-user-highlight-card">
        <div className="sl-user-highlight-left">
          <div className="sl-user-rank-box">
            <span className="sl-rank-label">Rank</span>
            <span className="sl-rank-number">{userRankDisplay}</span>
          </div>

          <div className="sl-user-details">
            <div className="sl-user-name-tag">
              <h2 className="sl-user-name">{displayName}</h2>
              <span className="sl-you-badge">YOU</span>
            </div>
            <span className="sl-user-grade-sub">
              {GRADE_OPTIONS.find((g) => g.value === (currentUserStats?.grade || studentContextGrade))?.label || "Student"}
            </span>
          </div>
        </div>

        <div className="sl-user-stats-row">
          <div className="sl-user-stat-item">
            <span className="sl-stat-title">Total XP</span>
            <span className="sl-stat-val">⭐ {userXpDisplay.toLocaleString()}</span>
          </div>
          <div className="sl-user-stat-item">
            <span className="sl-stat-title">Streak</span>
            <span className="sl-stat-val">🔥 {userStreakDisplay} {userStreakDisplay === 1 ? "Day" : "Days"}</span>
          </div>
          <div className="sl-user-stat-item">
            <span className="sl-stat-title">Gems</span>
            <span className="sl-stat-val">💎 {userGemsDisplay.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          3. CONTROLS BAR (TABS + GRADE FILTER)
      ═════════════════════════════════════════════ */}
      <div className="sl-control-bar">
        <div className="sl-tabs-group">
          <button
            type="button"
            className={`sl-tab-btn ${activeTab === "all_time" ? "active" : ""}`}
            onClick={() => setActiveTab("all_time")}
          >
            All-Time Leaderboard
          </button>
          <button
            type="button"
            className="sl-tab-btn disabled"
            disabled
            title="Weekly Leaderboard is coming in a future update"
          >
            Weekly (Coming Soon)
          </button>
          <button
            type="button"
            className="sl-tab-btn disabled"
            disabled
            title="Monthly Leaderboard is coming in a future update"
          >
            Monthly (Coming Soon)
          </button>
        </div>

        <div className="sl-filter-right">
          <select
            className="sl-grade-select"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            aria-label="Filter by grade"
          >
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          4. TOP 3 GAMIFIED PODIUM
      ═════════════════════════════════════════════ */}
      {!isLoading && !error && topThree.length > 0 && (
        <section className="sl-podium-section" aria-label="Top three students">
          <div className="sl-podium-heading">
            <div>
              <span className="sl-section-kicker">Top performers</span>
              <h2>Champions Arena</h2>
            </div>
            <span className="sl-podium-caption">Earn XP. Climb the ranks.</span>
          </div>

          <div className="sl-podium">
            {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((entry, index) => {
              const realRank = entry.rank;
              const podiumClass =
                realRank === 1 ? "podium-first" : realRank === 2 ? "podium-second" : "podium-third";

              return (
                <article key={`${entry.rank}-${index}`} className={`sl-podium-card ${podiumClass}`}>
                  <div className="sl-podium-glow" />
                  <div className="sl-podium-rank">
                    {realRank === 1 ? "01" : realRank === 2 ? "02" : "03"}
                  </div>

                  <div className="sl-podium-avatar-wrap">
                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt={entry.name}
                        className="sl-podium-avatar"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="sl-podium-avatar-fallback">
                        {entry.name ? entry.name.charAt(0).toUpperCase() : "S"}
                      </div>
                    )}
                  </div>

                  <div className="sl-podium-name">{entry.name}</div>
                  <div className="sl-podium-grade">
                    {GRADE_OPTIONS.find((g) => g.value === entry.grade)?.label || entry.grade.toUpperCase()}
                  </div>

                  <div className="sl-podium-xp">
                    <span>XP</span>
                    {entry.xpPoints.toLocaleString()}
                  </div>

                  <div className="sl-podium-base">
                    <span>{realRank === 1 ? "CHAMPION" : realRank === 2 ? "RUNNER UP" : "TOP 3"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ═════════════════════════════════════════════
          5. LEADERBOARD LIST PANEL
      ═════════════════════════════════════════════ */}
      <div className="sl-table-panel">
        {isLoading ? (
          /* ── Loading State ── */
          <div className="sl-state-box">
            <div className="sl-loading-spinner" />
            <h3 className="sl-state-title">Loading Leaderboard...</h3>
            <p className="sl-state-desc">Fetching real student progress and rankings from the database.</p>
          </div>
        ) : error ? (
          /* ── Error State ── */
          <div className="sl-state-box">
            <div className="sl-state-icon">⚠️</div>
            <h3 className="sl-state-title">Failed to load leaderboard</h3>
            <p className="sl-state-desc">{error}</p>
            <button
              type="button"
              className="sl-retry-btn"
              onClick={() => fetchLeaderboard(selectedGrade)}
            >
              🔄 Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          /* ── Empty State ── */
          <div className="sl-state-box">
            <div className="sl-state-icon">🏆</div>
            <h3 className="sl-state-title">No leaderboard data available yet.</h3>
            <p className="sl-state-desc">
              {selectedGrade
                ? "No student records found for the selected grade filter."
                : "No student records currently found in the system. Complete lessons and earn XP to be the first on the board!"}
            </p>
            {selectedGrade && (
              <button
                type="button"
                className="sl-retry-btn"
                onClick={() => setSelectedGrade("")}
              >
                View All Grades
              </button>
            )}
          </div>
        ) : (
          /* ── Table / Ranking Rows ── */
          <>
            <div className="sl-table-header">
              <div>Rank</div>
              <div>Student</div>
              <div>Grade</div>
              <div>Streak</div>
              <div style={{ textAlign: "right" }}>Total XP</div>
            </div>

            <div className="sl-table-body">
              {entries.map((entry) => {
                const gradeLabel =
                  GRADE_OPTIONS.find((g) => g.value === entry.grade)?.label ||
                  entry.grade.toUpperCase();

                const isTop1 = entry.rank === 1;
                const isTop2 = entry.rank === 2;
                const isTop3 = entry.rank === 3;

                return (
                  <div
                    key={entry.rank}
                    className={`sl-row ${entry.isCurrentUser ? "current-user" : ""}`}
                  >
                    {/* Rank */}
                    <div className="sl-col-rank">
                      <div
                        className={`sl-rank-medal ${isTop1
                          ? "rank-1"
                          : isTop2
                            ? "rank-2"
                            : isTop3
                              ? "rank-3"
                              : "rank-other"
                          }`}
                      >
                        {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${entry.rank}`}
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="sl-col-student">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="sl-avatar"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : null}
                      <div
                        className="sl-avatar-fallback"
                        style={entry.avatar ? { display: "none" } : {}}
                      >
                        {entry.name ? entry.name.charAt(0).toUpperCase() : "S"}
                      </div>

                      <div className="sl-student-names">
                        <span className="sl-student-name">{entry.name}</span>
                        {entry.isCurrentUser && (
                          <span className="sl-you-tag">YOU</span>
                        )}
                      </div>
                    </div>

                    {/* Grade */}
                    <div className="sl-col-grade">{gradeLabel}</div>

                    {/* Streak */}
                    <div className="sl-col-streak">
                      <span>🔥</span>
                      <span>{entry.streakDays}d</span>
                    </div>

                    {/* XP */}
                    <div className="sl-col-xp">
                      <span className="sl-xp-pill">⭐ {entry.xpPoints.toLocaleString()} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}