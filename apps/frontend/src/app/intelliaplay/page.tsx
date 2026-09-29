import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "@/styles/site-pages.css";

export const metadata: Metadata = {
  title: "IntelliaPlay — Math Games & Challenges | Intellia360",
  description:
    "IntelliaPlay turns maths practice into a game — daily quizzes, practice challenges, a quest map, XP, gems, streaks, badges and a leaderboard.",
};

// Every mode below is a feature of the student portal today.
const GAME_MODES = [
  {
    icon: "🎯",
    tint: "",
    title: "Daily Quiz",
    text: "A fresh set of questions every day. Play it to keep your streak going and pick up extra XP.",
  },
  {
    icon: "🧩",
    tint: "is-violet",
    title: "Practice Quizzes",
    text: "Short five-question sets for the topics in your grade. Your best score is kept, so there is always a record to beat.",
  },
  {
    icon: "🗺️",
    tint: "is-green",
    title: "Quest Map",
    text: "Your lessons laid out as a journey. Finish a topic to move along the path to the next challenge.",
  },
  {
    icon: "🏅",
    tint: "is-orange",
    title: "Achievements & Badges",
    text: "Unlock badges for milestones like finishing lessons, strong scores and long learning streaks.",
  },
  {
    icon: "🏆",
    tint: "is-pink",
    title: "Leaderboard",
    text: "See where your XP ranks — across every grade, or just your own.",
  },
  {
    icon: "💎",
    tint: "",
    title: "XP, Gems & Streaks",
    text: "Every activity you complete earns rewards, and learning a little each day builds your streak.",
  },
];

const STEPS = [
  {
    title: "Pick a challenge",
    text: "Start today’s Daily Quiz, choose a practice set, or head to the next stop on your Quest Map.",
  },
  {
    title: "Play and learn",
    text: "Answer questions built around your grade’s topics and see how you did straight away.",
  },
  {
    title: "Level up",
    text: "Collect XP and gems, grow your streak, unlock badges and climb the leaderboard.",
  },
];

export default function IntelliaPlayPage() {
  return (
    <main className="site-page">
      <SiteHeader />

      {/* HERO */}
      <section className="site-hero" aria-labelledby="play-title">
        <div className="site-container site-hero-grid">
          <div>
            <span className="site-eyebrow">🎮 GAME-BASED MATH PRACTICE</span>

            <h1 id="play-title">
              Play Math.
              <br />
              <span>Level Up for Real.</span>
            </h1>

            <p className="site-lead">
              IntelliaPlay is the play side of Intellia360 — quick challenges, daily
              quizzes, streaks, gems and badges that turn practice into something
              students want to come back to.
            </p>

            <div className="site-hero-actions">
              <Link href="/register" className="site-btn site-btn--primary">
                Start Playing →
              </Link>
              <a href="#game-modes" className="site-btn site-btn--ghost">
                Explore Game Modes ↓
              </a>
            </div>

            <ul className="site-hero-points" aria-label="Highlights">
              <li>🔥 Daily streaks</li>
              <li>⭐ XP &amp; levels</li>
              <li>🏅 Unlockable badges</li>
            </ul>
          </div>

          <div className="site-hero-visual" aria-hidden="true">
            <div className="site-visual-card play-card">
              <div className="play-card-head">
                <span className="play-card-tag">DAILY CHALLENGE</span>
                <span className="play-card-count">Question 3 of 5</span>
              </div>
              <div className="play-card-progress">
                <span />
              </div>
              <p className="play-card-question">What is ¾ of 20?</p>
              <div className="play-card-options">
                <span>10</span>
                <span>12</span>
                <span className="is-correct">15 ✓</span>
                <span>18</span>
              </div>
              <div className="play-card-reward">
                <span>Correct — nice work!</span>
                <strong>+25 XP</strong>
              </div>
            </div>

            <div className="site-visual-chip is-top">
              <span className="chip-icon is-orange">🔥</span>
              <span>
                <strong>7-day streak</strong>
                <small>Keep it going!</small>
              </span>
            </div>

            <div className="site-visual-chip is-bottom">
              <span className="chip-icon">★</span>
              <span>
                <strong>Badge unlocked</strong>
                <small>New achievement</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="site-section is-white" id="how-it-works" aria-labelledby="play-how-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">How it works</span>
            <h2 id="play-how-title">
              Practice That Feels Like <span>a Game</span>
            </h2>
            <p>Every challenge is tied to a topic in the student’s grade, so the points always come from real learning.</p>
          </div>

          <div className="site-grid site-grid--3">
            {STEPS.map((step, index) => (
              <article className="site-card" key={step.title}>
                <span className="site-step" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="site-card-icon" aria-hidden="true">
                  {["🎯", "🧠", "🚀"][index]}
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GAME MODES */}
      <section className="site-section" id="game-modes" aria-labelledby="play-modes-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">Game modes</span>
            <h2 id="play-modes-title">
              Six Ways to <span>Play and Progress</span>
            </h2>
            <p>All of them live in the student learning portal and share one set of XP, gems and badges.</p>
          </div>

          <div className="site-grid site-grid--3">
            {GAME_MODES.map((mode) => (
              <article className="site-card" key={mode.title}>
                <div className={`site-card-icon ${mode.tint}`} aria-hidden="true">
                  {mode.icon}
                </div>
                <h3>{mode.title}</h3>
                <p>{mode.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOR FAMILIES & TEACHERS */}
      <section className="site-section is-white" aria-labelledby="play-learning-title">
        <div className="site-container site-split">
          <div>
            <span className="site-kicker">Built for learning</span>
            <h2 id="play-learning-title">
              The Fun Keeps <span>Everyone Informed</span>
            </h2>
            <p>
              Points and badges keep students motivated, while the progress behind
              them stays visible to the adults supporting their learning.
            </p>
            <ul className="site-checklist">
              <li>Progress is saved to the student’s account, so they can pick up where they left off.</li>
              <li>Teachers follow class progress and engagement in the Teacher Console.</li>
              <li>Parents can follow their child’s progress and achievements with a parent account.</li>
            </ul>
            <div className="site-hero-actions">
              <Link href="/schools" className="site-btn site-btn--ghost">
                IntelliaPlay for Schools →
              </Link>
            </div>
          </div>

          <div className="site-grid site-grid--2">
            <article className="site-card">
              <div className="site-card-icon is-orange" aria-hidden="true">🔥</div>
              <h3>Streaks</h3>
              <p>Learning a little every day keeps the flame alive.</p>
            </article>
            <article className="site-card">
              <div className="site-card-icon" aria-hidden="true">⭐</div>
              <h3>XP</h3>
              <p>Earned for lessons, quizzes and challenges.</p>
            </article>
            <article className="site-card">
              <div className="site-card-icon is-violet" aria-hidden="true">💎</div>
              <h3>Gems</h3>
              <p>Collected alongside XP as rewards for learning.</p>
            </article>
            <article className="site-card">
              <div className="site-card-icon is-green" aria-hidden="true">🏅</div>
              <h3>Badges</h3>
              <p>Unlocked when students reach milestones.</p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="site-cta" aria-labelledby="play-cta-title">
        <div className="site-container">
          <div className="site-cta-box">
            <div>
              <h2 id="play-cta-title">Ready to Play?</h2>
              <p>Create your account to start earning XP, building streaks and unlocking badges.</p>
            </div>
            <div className="site-cta-actions">
              <Link href="/register" className="site-btn site-btn--light">
                Create Account
              </Link>
              <Link href="/login" className="site-btn site-btn--outline-light">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
