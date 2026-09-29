"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { STREAK_BADGES } from "@intellia360/shared/streak/badges";
import { apiFetch } from "@/lib/api";

interface WidgetData {
  alreadyCompleted: boolean;
  streakDays:       number;
  score?:           number;
  xpAwarded?:       number;
  gemsAwarded?:     number;
}

export default function DailyStreakWidget() {
  const [data,    setData]    = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/student/daily-quiz")
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setData({
            alreadyCompleted: j.data.alreadyCompleted,
            streakDays:       j.data.streakDays,
            score:            j.data.attempt?.score,
            xpAwarded:        j.data.attempt?.xpAwarded,
            gemsAwarded:      j.data.attempt?.gemsAwarded,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Next milestone
  const nextMilestone = STREAK_BADGES.find(
    b => !data || b.streakDays > (data.streakDays ?? 0)
  );

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  if (loading) {
    return (
      <div className="db-panel" style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: ".85rem" }}>
        Loading daily quiz…
      </div>
    );
  }

  // ── Already done today ──────────────────────────────────────────────────────
  if (data?.alreadyCompleted) {
    return (
      <div className="db-panel" style={{ overflow: "hidden" }}>
        {/* Header bar */}
        <div style={{ background: "linear-gradient(135deg,#1e1b4b,#4c1d95)", padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: ".72rem", fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              Daily Quiz
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginTop: 2 }}>
              ✅ Completed Today!
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
              🔥 {data.streakDays}
            </div>
            <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.5)" }}>day streak</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 20px 16px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={pill("#f97316")}>⭐ +{data.xpAwarded ?? 0} XP</div>
            <div style={pill("#7c3aed")}>💎 +{data.gemsAwarded ?? 0} Gems</div>
            <div style={pill("#10b981")}>Score: {data.score ?? 0}/5</div>
          </div>

          {nextMilestone && (
            <div style={{ background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.15)", borderRadius: 10, padding: "10px 12px", fontSize: ".78rem", color: "#64748b" }}>
              <strong style={{ color: "#f97316" }}>Next: {nextMilestone.emoji} {nextMilestone.title}</strong>
              {" "}in {nextMilestone.streakDays - data.streakDays} more day{nextMilestone.streakDays - data.streakDays !== 1 ? "s" : ""}
            </div>
          )}

          <Link href="/student/daily-quiz" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: ".8rem", color: "#9ca3af" }}>
            View Results
          </Link>
        </div>
      </div>
    );
  }

  // ── Not done yet ────────────────────────────────────────────────────────────
  return (
    <div className="db-panel" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: ".72rem", fontWeight: 700, color: "rgba(255,255,255,.65)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            {todayDateStr}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginTop: 2 }}>
            Daily Quiz Ready! 🎯
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
            🔥 {data?.streakDays ?? 1}
          </div>
          <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,.65)" }}>day streak</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 20px 16px" }}>
        <p style={{ fontSize: ".82rem", color: "#4b5563", margin: "0 0 12px", lineHeight: 1.55 }}>
          5 fresh questions today. Answer them to keep your streak alive and earn XP &amp; badges!
        </p>

        {/* Milestone preview */}
        {nextMilestone && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.15)", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: ".78rem" }}>
            <span style={{ fontSize: "1.1rem" }}>{nextMilestone.emoji}</span>
            <div>
              <strong style={{ color: "#7c3aed" }}>{nextMilestone.title}</strong>
              <span style={{ color: "#64748b" }}> — {nextMilestone.streakDays - (data?.streakDays ?? 1)} day{nextMilestone.streakDays - (data?.streakDays ?? 1) !== 1 ? "s" : ""} away</span>
            </div>
          </div>
        )}

        {/* Reward preview */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={rewardBadge("⭐", "#f97316", "Up to 75 XP")}>
            <span>⭐</span>
            <span>Up to 75 XP</span>
          </div>
          <div style={rewardBadge("💎", "#7c3aed", "Up to 25 Gems")}>
            <span>💎</span>
            <span>Up to 25 Gems</span>
          </div>
        </div>

        <Link href="/student/daily-quiz"
          style={{ display: "block", textAlign: "center", padding: "11px 20px",
            background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
            borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: ".9rem",
            boxShadow: "0 4px 12px rgba(249,115,22,.35)" }}>
          Take Today&apos;s Quiz →
        </Link>
      </div>
    </div>
  );
}

// ── Inline style helpers ──────────────────────────────────────────────────────
function pill(color: string): React.CSSProperties {
  return {
    padding:      "4px 10px",
    borderRadius: 999,
    background:   `${color}18`,
    border:       `1px solid ${color}30`,
    color,
    fontWeight:   700,
    fontSize:     ".75rem",
  };
}

function rewardBadge(_icon: string, color: string, _label: string): React.CSSProperties {
  return {
    flex:         1,
    display:      "flex",
    alignItems:   "center",
    gap:          6,
    padding:      "7px 10px",
    borderRadius: 9,
    background:   `${color}10`,
    border:       `1px solid ${color}25`,
    fontSize:     ".75rem",
    fontWeight:   600,
    color,
  };
}
