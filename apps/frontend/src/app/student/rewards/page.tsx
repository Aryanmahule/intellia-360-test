"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useStudentContext } from "@/context/StudentContext";
import "./rewards.css";

type Mission = {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: string;
  current: number;
  target: number;
  tone: "purple" | "orange" | "blue";
};

type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "mastery" | "streak" | "completion" | "gems";
};

type ShopItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  cost: number;
  rarity: "Common" | "Rare" | "Epic";
};

const BADGES: BadgeDefinition[] = [
  {
    id: "b_1",
    title: "Place Value Master",
    description: "Complete the full Place Value learning path.",
    icon: "PV",
    category: "mastery",
  },
  {
    id: "b_2",
    title: "Streak Champion",
    description: "Build and maintain a 7-day learning streak.",
    icon: "7D",
    category: "streak",
  },
  {
    id: "b_3",
    title: "First Steps Explorer",
    description: "Complete your first lesson adventure.",
    icon: "GO",
    category: "completion",
  },
  {
    id: "b_4",
    title: "Quiz Ace",
    description: "Score 100% in a practice challenge.",
    icon: "100",
    category: "mastery",
  },
  {
    id: "b_5",
    title: "Gem Collector",
    description: "Collect more than 100 Learning Gems.",
    icon: "G",
    category: "gems",
  },
  {
    id: "b_6",
    title: "Math Pioneer",
    description: "Complete 5 or more curriculum lessons.",
    icon: "MP",
    category: "completion",
  },
];

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "avatar-spark",
    title: "Spark Avatar Frame",
    subtitle: "A luminous frame for your profile.",
    icon: "SF",
    cost: 80,
    rarity: "Common",
  },
  {
    id: "nebula",
    title: "Nebula Trail",
    subtitle: "A cosmic effect for your quest path.",
    icon: "NT",
    cost: 150,
    rarity: "Rare",
  },
  {
    id: "golden-crown",
    title: "Golden Crown",
    subtitle: "Show off your top-level achievement.",
    icon: "GC",
    cost: 250,
    rarity: "Epic",
  },
  {
    id: "rocket",
    title: "Rocket Companion",
    subtitle: "A little mission buddy for your dashboard.",
    icon: "RC",
    cost: 320,
    rarity: "Epic",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export default function StudentRewardsPage() {
  const {
    studentName,
    currentGrade,
    xpPoints,
    learningGems,
    streakDays,
    completedLessons,
    completedActivities,
    unlockedBadges,
  } = useStudentContext();

  const [activeTab, setActiveTab] = useState<"all" | "badges" | "shop">("all");
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  const level = Math.max(1, Math.floor(xpPoints / 500) + 1);
  const levelStartXp = (level - 1) * 500;
  const xpIntoLevel = Math.max(0, xpPoints - levelStartXp);
  const xpToNextLevel = 500;
  const levelPercent = clamp(
    Math.round((xpIntoLevel / xpToNextLevel) * 100),
    0,
    100
  );

  const missions = useMemo<Mission[]>(
    () => [
      {
        id: "mission-lesson",
        title: "Lesson Runner",
        description: "Complete 2 learning activities today.",
        icon: "LR",
        reward: "+60 XP",
        current: Math.min(completedLessons.length, 2),
        target: 2,
        tone: "purple",
      },
      {
        id: "mission-streak",
        title: "Keep the Flame",
        description: "Reach a 7-day learning streak.",
        icon: "SF",
        reward: "+100 XP",
        current: Math.min(streakDays, 7),
        target: 7,
        tone: "orange",
      },
      {
        id: "mission-practice",
        title: "Practice Pilot",
        description: "Finish 5 tracked activities.",
        icon: "PP",
        reward: "+80 XP",
        current: Math.min(completedActivities.length, 5),
        target: 5,
        tone: "blue",
      },
    ],
    [completedLessons, completedActivities, streakDays]
  );

  const unlockedSet = new Set(unlockedBadges);
  const earnedBadges = BADGES.filter((badge) => unlockedSet.has(badge.id));
  const lockedBadges = BADGES.filter((badge) => !unlockedSet.has(badge.id));

  const handleClaimPreview = (missionId: string) => {
    const mission = missions.find((item) => item.id === missionId);
    if (!mission || mission.current < mission.target) return;
    // This page stays frontend-only until the rewards API is connected.
  };

  const handleBuy = (item: ShopItem) => {
    if (learningGems < item.cost || ownedItems.includes(item.id)) return;
    setOwnedItems((current) => [...current, item.id]);
  };

  return (
    <main className="student-rewards-page">
      <section className="rewards-shell">
        <header className="rewards-hero">
          <div className="rewards-hero-copy">
            <span className="rewards-eyebrow">Rewards Center</span>
            <h1>
              Build your streak.
              <span> Unlock your next level.</span>
            </h1>
            <p>
              Earn XP, complete missions, collect badges, and spend your
              Learning Gems on profile upgrades.
            </p>

            <div className="rewards-hero-actions">
              <Link href="/student/quiz" className="rewards-primary-btn">
                Start a Challenge
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/student/leaderboard" className="rewards-secondary-btn">
                View Leaderboard
              </Link>
            </div>
          </div>

          <div className="reward-orb-stage" aria-hidden="true">
            <div className="reward-orb reward-orb-back" />
            <div className="reward-orb reward-orb-main">
              <div className="reward-cube">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="reward-orb-ring ring-one" />
            <div className="reward-orb-ring ring-two" />
            <div className="reward-floating-chip chip-one">+XP</div>
            <div className="reward-floating-chip chip-two">GEMS</div>
            <div className="reward-floating-chip chip-three">BADGE</div>
          </div>

          <div className="rewards-level-panel">
            <div className="level-panel-top">
              <div>
                <span className="level-caption">Current level</span>
                <strong>Level {level}</strong>
              </div>
              <span className="level-grade">{currentGrade || "Math Explorer"}</span>
            </div>
            <div className="level-progress-track">
              <span style={{ width: `${levelPercent}%` }} />
            </div>
            <div className="level-panel-bottom">
              <span>{xpPoints.toLocaleString()} XP</span>
              <span>{500 - xpIntoLevel} XP to next level</span>
            </div>
          </div>
        </header>

        <section className="rewards-stat-grid" aria-label="Reward statistics">
          <article className="reward-stat-card reward-stat-xp">
            <div className="stat-icon">XP</div>
            <div>
              <span>Total XP</span>
              <strong>{xpPoints.toLocaleString()}</strong>
              <small>Level {level} explorer</small>
            </div>
          </article>

          <article className="reward-stat-card reward-stat-gems">
            <div className="stat-icon">G</div>
            <div>
              <span>Learning Gems</span>
              <strong>{learningGems.toLocaleString()}</strong>
              <small>Spend them in the shop</small>
            </div>
          </article>

          <article className="reward-stat-card reward-stat-streak">
            <div className="stat-icon">ST</div>
            <div>
              <span>Daily Streak</span>
              <strong>{streakDays} days</strong>
              <small>{Math.max(0, 7 - streakDays)} days to 7-day badge</small>
            </div>
          </article>

          <article className="reward-stat-card reward-stat-badges">
            <div className="stat-icon">BD</div>
            <div>
              <span>Badges Earned</span>
              <strong>
                {earnedBadges.length}/{BADGES.length}
              </strong>
              <small>Keep unlocking milestones</small>
            </div>
          </article>
        </section>

        <div className="rewards-tabs" role="tablist" aria-label="Rewards filters">
          <button
            type="button"
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            Missions
          </button>
          <button
            type="button"
            className={activeTab === "badges" ? "active" : ""}
            onClick={() => setActiveTab("badges")}
          >
            Badge Gallery
          </button>
          <button
            type="button"
            className={activeTab === "shop" ? "active" : ""}
            onClick={() => setActiveTab("shop")}
          >
            Gem Shop
          </button>
        </div>

        {(activeTab === "all" || activeTab === "badges") && (
          <section className="reward-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Daily + weekly progression</span>
                <h2>Mission Control</h2>
              </div>
              <span className="section-meta">Complete missions to accelerate XP</span>
            </div>

            <div className="mission-grid">
              {missions.map((mission) => {
                const percent = clamp(
                  Math.round((mission.current / mission.target) * 100),
                  0,
                  100
                );
                const complete = mission.current >= mission.target;

                return (
                  <article
                    key={mission.id}
                    className={`mission-card mission-${mission.tone}`}
                  >
                    <div className="mission-card-top">
                      <div className="mission-icon">{mission.icon}</div>
                      <span className="mission-reward">{mission.reward}</span>
                    </div>
                    <h3>{mission.title}</h3>
                    <p>{mission.description}</p>
                    <div className="mission-progress">
                      <div className="mission-progress-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <div className="mission-progress-labels">
                        <span>
                          {mission.current}/{mission.target} complete
                        </span>
                        <strong>{percent}%</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={complete ? "mission-claim ready" : "mission-claim"}
                      disabled={!complete}
                      onClick={() => handleClaimPreview(mission.id)}
                    >
                      {complete ? "Ready to Claim" : "Keep Going"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(activeTab === "all" || activeTab === "badges") && (
          <section className="reward-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Your achievement wall</span>
                <h2>Badge Gallery</h2>
              </div>
              <span className="section-meta">
                {earnedBadges.length} unlocked
              </span>
            </div>

            <div className="badge-layout">
              <article className="featured-badge-card">
                <div className="badge-pedestal">
                  <div className="badge-3d">
                    <span>360</span>
                  </div>
                  <div className="badge-shadow" />
                </div>
                <div className="featured-badge-copy">
                  <span className="featured-label">Featured achievement</span>
                  <h3>
                    {earnedBadges[0]?.title || "Your first badge is waiting"}
                  </h3>
                  <p>
                    {earnedBadges[0]?.description ||
                      "Complete your first learning milestone to start your achievement collection."}
                  </p>
                  <div className="featured-badge-footer">
                    <span>
                      {earnedBadges.length} / {BADGES.length} badges
                    </span>
                    <span className="featured-divider" />
                    <span>{studentName || "Explorer"}</span>
                  </div>
                </div>
              </article>

              <div className="badge-grid">
                {BADGES.map((badge) => {
                  const unlocked = unlockedSet.has(badge.id);
                  return (
                    <article
                      key={badge.id}
                      className={`badge-card ${unlocked ? "unlocked" : "locked"}`}
                    >
                      <div className="badge-icon-wrap">
                        <div className="badge-icon-3d">{badge.icon}</div>
                        {!unlocked && <div className="badge-lock">LOCKED</div>}
                      </div>
                      <div className="badge-card-body">
                        <span className="badge-category">{badge.category}</span>
                        <h3>{badge.title}</h3>
                        <p>{badge.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {lockedBadges.length > 0 && (
              <div className="next-unlock-banner">
                <div className="next-unlock-icon">NEXT</div>
                <div>
                  <strong>Next unlock: {lockedBadges[0].title}</strong>
                  <span>{lockedBadges[0].description}</span>
                </div>
                <Link href="/student/dashboard">Continue Learning →</Link>
              </div>
            )}
          </section>
        )}

        {(activeTab === "all" || activeTab === "shop") && (
          <section className="reward-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Spend your Learning Gems</span>
                <h2>Gem Shop</h2>
              </div>
              <span className="section-meta">{learningGems} gems available</span>
            </div>

            <div className="shop-layout">
              <div className="shop-intro-card">
                <div className="shop-crystal" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                </div>
                <div>
                  <span className="shop-label">Your wallet</span>
                  <strong>{learningGems.toLocaleString()}</strong>
                  <p>
                    Unlock profile cosmetics and collectible companions as
                    your gem balance grows.
                  </p>
                </div>
              </div>

              <div className="shop-grid">
                {SHOP_ITEMS.map((item) => {
                  const owned = ownedItems.includes(item.id);
                  const affordable = learningGems >= item.cost;

                  return (
                    <article key={item.id} className="shop-item-card">
                      <div className="shop-item-visual">
                        <div className="shop-item-orb">{item.icon}</div>
                        <span className={`rarity rarity-${item.rarity.toLowerCase()}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <div className="shop-item-copy">
                        <h3>{item.title}</h3>
                        <p>{item.subtitle}</p>
                      </div>
                      <div className="shop-item-bottom">
                        <span className="shop-cost">
                          <i>G</i> {item.cost}
                        </span>
                        <button
                          type="button"
                          disabled={!affordable || owned}
                          className={owned ? "owned" : ""}
                          onClick={() => handleBuy(item)}
                        >
                          {owned ? "Owned" : affordable ? "Preview" : "Need More"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <p className="rewards-note">
              Shop actions are frontend previews for now; connect the purchase
              action to the rewards API when the gamification backend is wired.
            </p>
          </section>
        )}

        <section className="reward-bottom-grid">
          <article className="streak-card">
            <div className="streak-card-glow" />
            <div className="streak-copy">
              <span className="section-kicker">Consistency bonus</span>
              <h2>{streakDays} day streak</h2>
              <p>
                Keep learning daily to unlock your Streak Champion milestone.
              </p>
              <div className="streak-week">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                  const active = index < Math.min(streakDays, 7);
                  return (
                    <span key={`${day}-${index}`} className={active ? "active" : ""}>
                      <b>{day}</b>
                      <i>{active ? "•" : ""}</i>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="streak-medal" aria-hidden="true">
              <div>7D</div>
            </div>
          </article>

          <article className="quick-reward-card">
            <span className="section-kicker">Keep progressing</span>
            <h2>One more challenge?</h2>
            <p>
              Jump back into your current topic and turn today's effort into
              more XP and Gems.
            </p>
            <div className="quick-reward-actions">
              <Link href="/student/courses">Explore Courses</Link>
              <Link href="/student/quiz">Take a Quiz</Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
