"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "./home.css";
import { apiFetch } from "@/lib/api";

type HomepageLeaderboardEntry = {
  // No userId: the public leaderboard does not expose account identifiers.
  name: string;
  avatar?: string | null;
  rank: number;
  xpPoints: number;
  isCurrentUser?: boolean;
};

/* ============================================================
   FEATURES
============================================================ */

const features = [
  {
    title: "Personalized Learning",
    text: "AI creates a learning path designed around every student's needs.",
  },
  {
    title: "Gamified Experience",
    text: "Earn XP, unlock badges, build streaks and complete exciting challenges.",
  },
  {
    title: "Interactive Lessons",
    text: "Learn through stories, visuals, animations and engaging activities.",
  },
  {
    title: "Level Up",
    text: "Track XP, skills, streaks and learning progress as you grow.",
  },
  {
    title: "Safe & Secure",
    text: "A trusted and secure learning environment for students.",
  },
  {
    title: "AI Learning Buddy",
    text: "Get hints, explanations and personalized help whenever you need it.",
  },
];

/* ============================================================
   LEARNING JOURNEY
   Wonder → Story → Simulate → Play → Reflect
============================================================ */

const steps = [
  {
    number: "01",
    image: "/assets/home/wonder-3d.png",
    title: "Wonder",
    text: "Spark curiosity with an exciting question, visual or real-world problem.",
  },
  {
    number: "02",
    image: "/assets/home/story.png",
    title: "Story",
    text: "Learn the concept through engaging stories, explanations and visual examples.",
  },
  {
    number: "03",
    image: "/assets/home/simulate.png",
    title: "Simulate",
    text: "Explore the concept through interactive visuals and hands-on simulations.",
  },
  {
    number: "04",
    image: "/assets/home/play.png",
    title: "Play",
    text: "Apply what you learned through games, challenges, quizzes and activities.",
  },
  {
    number: "05",
    image: "/assets/home/reflect-3d.png",
    title: "Reflect",
    text: "Review your learning, track your progress and celebrate your achievements.",
  },
];

/* ============================================================
   SHOWCASE
============================================================ */

const showcase = [
  {
    image: "/assets/home/interactive-demo.png",
    title: "Interactive Lessons",
    description:
      "Visual, interactive and concept-based learning that makes mathematics easy to understand.",
  },
  {
    image: "/assets/home/gamified-demo.png",
    title: "Gamified Practice",
    description:
      "Practice through games, challenges and quizzes while earning XP and rewards.",
  },
  {
    image: "/assets/home/progress-demo.png",
    title: "AI Progress Tracking",
    description:
      "AI tracks performance, identifies learning gaps and personalizes the learning journey.",
  },
];

/* ============================================================
   COURSES
============================================================ */

const courses = [
  {
    grade: "LKG",
    title: "LKG Mathematics",
    subtitle: "Numbers • Shapes • Patterns",
    color: "orange",
    students: "Early Learners",
    lessons: "12+ Lessons",
  },
  {
    grade: "UKG",
    title: "UKG Mathematics",
    subtitle: "Counting • Addition • Shapes",
    color: "purple",
    students: "Early Learners",
    lessons: "18+ Lessons",
  },
  {
    grade: "1",
    title: "Grade 1 Math",
    subtitle: "Numbers • Counting • Addition",
    color: "blue",
    students: "Primary",
    lessons: "24+ Lessons",
  },
  {
    grade: "2",
    title: "Grade 2 Math",
    subtitle: "Addition • Subtraction • Patterns",
    color: "green",
    students: "Primary",
    lessons: "28+ Lessons",
  },
  {
    grade: "3",
    title: "Grade 3 Math",
    subtitle: "Multiplication • Division • Fractions",
    color: "pink",
    students: "Primary",
    lessons: "32+ Lessons",
  },
  {
    grade: "4",
    title: "Grade 4 Math",
    subtitle: "Fractions • Geometry • Decimals",
    color: "orange",
    students: "Primary",
    lessons: "36+ Lessons",
  },
  {
    grade: "5",
    title: "Grade 5 Math",
    subtitle: "Fractions • Geometry • Problem Solving",
    color: "purple",
    students: "Primary",
    lessons: "40+ Lessons",
  },
  {
    grade: "6",
    title: "Grade 6 Math",
    subtitle: "Algebra • Ratios • Geometry",
    color: "blue",
    students: "Middle School",
    lessons: "44+ Lessons",
  },
  {
    grade: "7",
    title: "Grade 7 Math",
    subtitle: "Algebra • Equations • Data",
    color: "green",
    students: "Middle School",
    lessons: "48+ Lessons",
  },
  {
    grade: "8",
    title: "Grade 8 Math",
    subtitle: "Linear Equations • Geometry • Graphs",
    color: "pink",
    students: "Middle School",
    lessons: "52+ Lessons",
  },
  {
    grade: "9",
    title: "Grade 9 Math",
    subtitle: "Algebra • Coordinate Geometry",
    color: "orange",
    students: "Secondary",
    lessons: "56+ Lessons",
  },
  {
    grade: "10",
    title: "Grade 10 Math",
    subtitle: "Quadratics • Trigonometry • Statistics",
    color: "purple",
    students: "Secondary",
    lessons: "60+ Lessons",
  },
  {
    grade: "11",
    title: "Grade 11 Math",
    subtitle: "Functions • Calculus • Probability",
    color: "blue",
    students: "Senior Secondary",
    lessons: "65+ Lessons",
  },
  {
    grade: "12",
    title: "Grade 12 Math",
    subtitle: "Calculus • Vectors • Probability",
    color: "green",
    students: "Senior Secondary",
    lessons: "70+ Lessons",
  },
];

/* ============================================================
   AUDIENCE
============================================================ */

const audiences = [
  {
    icon: "👨‍👩‍👧",
    title: "For Parents",
    color: "blue",
    description: "Stay connected with your child’s learning journey.",
    points: ["Track progress", "Spot learning gaps", "Encourage consistent practice"],
  },
  {
    icon: "🎓",
    title: "For Students",
    color: "purple",
    description: "Turn everyday learning into an exciting adventure.",
    points: ["Earn XP & badges", "Play interactive challenges", "Learn at your own pace"],
  },
  {
    icon: "🏫",
    title: "For Schools",
    color: "orange",
    description: "Bring engaging, data-driven learning into every classroom.",
    points: ["Manage students", "Monitor progress", "Scale learning securely"],
  },
  {
    icon: "👩‍🏫",
    title: "For Teachers",
    color: "green",
    description: "Powerful tools to teach better and understand every learner.",
    points: ["View learning insights", "Identify skill gaps", "Support personalized learning"],
  },
  {
    icon: "🏢",
    title: "For Coaching Centres",
    color: "pink",
    description: "Make coaching more interactive, measurable and rewarding.",
    points: ["Interactive curriculum", "Performance analytics", "Gamified practice"],
  },
];

/* ============================================================
   CLICK-OPEN DROPDOWNS
   The CSS classes dropdown-open, dropdown-trigger-active and
   mega-menu-open are intentionally controlled by React state.
   This keeps the header in the same position while the dropdown
   opens and only changes the trigger to a light-blue active shade.
============================================================ */

/* ============================================================
   EXPERIENCE VIDEO ROW
   - 3 separate videos
   - Autoplay muted
   - Click video/card to toggle sound
   - Keeps every video inside a fixed video card
============================================================ */

type ExperienceVideoItem = {
  title: string;
  label: string;
  text: string;
  points: string[];
  video: string;
};

function ExperienceVideoRow({
  item,
  index,
}: {
  item: ExperienceVideoItem;
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  const toggleVideoSound = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.muted) {
        video.muted = false;
        video.volume = 1;
        setSoundOn(true);
        await video.play();
      } else {
        video.muted = true;
        setSoundOn(false);
      }
    } catch (error) {
      console.error("[Experience Video] Unable to toggle sound:", error);
    }
  };

  const handleVideoKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void toggleVideoSound();
    }
  };

  const rewardXP = [120, 180, 250][index] ?? 120;
  const stage = ["EXPLORE", "PRACTICE", "MASTER"][index] ?? "LEARN";

  return (
    <article className={`experience-quest-card ${index % 2 === 0 ? "content-left" : "video-left"}`}>
      <div className="experience-quest-copy">
        <div className="experience-quest-topline">
          <span className="experience-quest-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="experience-quest-stage">{stage} QUEST</span>
          <span className="experience-quest-xp">+{rewardXP} XP</span>
        </div>

        <span className="experience-label">{item.label}</span>
        <h3>{item.title}</h3>
        <p>{item.text}</p>

        <div className="experience-reward-row">
          <span className="experience-reward-dot" aria-hidden="true" />
          <span>Complete this learning challenge to level up your skills.</span>
        </div>

        <ul>
          {item.points.map((point) => (
            <li key={point}>
              <span className="experience-check" aria-hidden="true">✓</span>
              <span className="experience-point-text">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`experience-quest-video ${soundOn ? "sound-active" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={`${item.title}. Click to ${soundOn ? "mute" : "turn on sound"}`}
        onClick={() => void toggleVideoSound()}
        onKeyDown={handleVideoKeyDown}
      >
        <video
          ref={videoRef}
          className="experience-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src={item.video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="experience-video-overlay" aria-hidden="true" />

        <div className="experience-video-badge">
          <span className="experience-video-badge-icon">▶</span>
          <span>{soundOn ? "Sound On" : "Preview Quest"}</span>
        </div>

        <div className="experience-video-progress" aria-hidden="true">
          <span />
        </div>

        <div className="experience-sound-control">
          <span className="experience-sound-icon" aria-hidden="true">{soundOn ? "ON" : "OFF"}</span>
          <span>{soundOn ? "Sound On" : "Click for Sound"}</span>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   INTELLIAPLAY
   Same six modes as the /intelliaplay page, summarised here.
============================================================ */

const playModes = [
  { icon: "🎯", title: "Daily Quiz", text: "A fresh set of questions every day — play it to keep your streak alive." },
  { icon: "🧩", title: "Practice Quizzes", text: "Short five-question sets per topic, with your best score kept." },
  { icon: "🗺️", title: "Quest Map", text: "Lessons laid out as a journey — finish a topic to unlock the next." },
  { icon: "🏅", title: "Badges", text: "Unlock achievements for milestones, strong scores and long streaks." },
  { icon: "🏆", title: "Leaderboard", text: "See where your XP ranks across your grade — or everyone." },
  { icon: "💎", title: "XP, Gems & Streaks", text: "Every activity earns rewards, and daily learning builds your streak." },
];

/* ============================================================
   PAGE
============================================================ */

export default function HomePage() {

  // ============================================================
  // LIVE HOMEPAGE LEADERBOARD
  // Reuses the existing student leaderboard API/database.
  // ============================================================
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<HomepageLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchHomepageLeaderboard = useCallback(async () => {
    try {
      setLeaderboardLoading(true);

      // The endpoint sets Cache-Control (60s fresh, 5min stale-while-revalidate).
      // "no-store" forced a database round-trip on every poll and from every
      // anonymous visitor; "default" lets the browser and CDN absorb repeats.
      const response = await apiFetch("/api/student/leaderboard?limit=10", {
        cache: "default",
      });

      if (!response.ok) {
        throw new Error(`Leaderboard request failed: ${response.status}`);
      }

      const json = await response.json();

      if (json?.success && json?.data) {
        setLeaderboardEntries(
          Array.isArray(json.data.entries) ? json.data.entries.slice(0, 10) : []
        );
      } else {
        setLeaderboardEntries([]);
      }
    } catch (error) {
      console.error("[Homepage Leaderboard]", error);
      setLeaderboardEntries([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // The header closes its own mega-menus; this only owns the leaderboard.
      if (!target.closest(".homepage-leaderboard-widget")) {
        setLeaderboardOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchHomepageLeaderboard();

    // Refresh periodically so homepage rankings stay current. The interval is
    // aligned with the endpoint cache window — polling faster than the cache
    // is fresh just re-reads the same response.
    const interval = window.setInterval(fetchHomepageLeaderboard, 120000);

    return () => window.clearInterval(interval);
  }, [fetchHomepageLeaderboard]);

  return (
    <main className="home-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <SiteHeader />
      {/* ======================================================
    HERO SECTION
====================================================== */}

      <section className="hero-section" aria-labelledby="home-hero-title">
        <div className="home-container hero-grid">

          {/* ==================================================
              HERO CONTENT
          ================================================== */}
          <div className="hero-content">

            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" aria-hidden="true" />
              PLAY • LEARN • LEVEL UP
            </div>

            <h1 id="home-hero-title">
              Turn Learning Into
              <br />
              <span>an Adventure.</span>
            </h1>

            <p className="hero-description">
              Explore interactive mathematics, complete challenges, earn XP,
              build streaks and unlock achievements as you learn.
            </p>

            <div className="hero-actions">
              <Link href="/login" className="hero-primary">
                Start Your Quest
                <span aria-hidden="true">→</span>
              </Link>

              <Link href="/courses" className="hero-secondary">
                Explore Courses
              </Link>
            </div>

            {/* Gamification feature strip */}
            <div className="hero-gamification-strip" aria-label="Gamification features">
              <div className="hero-game-stat">
                <span className="hero-game-icon hero-game-icon-xp" aria-hidden="true">XP</span>
                <span>
                  <strong>Earn XP</strong>
                  <small>For every challenge</small>
                </span>
              </div>

              <div className="hero-game-divider" aria-hidden="true" />

              <div className="hero-game-stat">
                <span className="hero-game-icon hero-game-icon-streak" aria-hidden="true">7</span>
                <span>
                  <strong>Build Streaks</strong>
                  <small>Keep learning daily</small>
                </span>
              </div>

              <div className="hero-game-divider" aria-hidden="true" />

              <div className="hero-game-stat">
                <span className="hero-game-icon hero-game-icon-badge" aria-hidden="true">★</span>
                <span>
                  <strong>Unlock Badges</strong>
                  <small>Celebrate milestones</small>
                </span>
              </div>
            </div>

          </div>

          {/* ==================================================
              GAMIFIED MASCOT / QUEST CARD
          ================================================== */}
          <div className="hero-video-area">

            <div className="hero-quest-card">

              <div className="hero-quest-topline">
                <span className="hero-quest-status">
                  <span className="hero-status-dot" aria-hidden="true" />
                  LEARNING QUEST
                </span>
                <span className="hero-quest-level">LEVEL UP</span>
              </div>

              <div className="hero-video-card">
                <video
                  className="mascot-hero-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  // No browser picture-in-picture/cast overlay on top of the mascot.
                  disablePictureInPicture
                  disableRemotePlayback
                  onClick={(e) => {
                    const video = e.currentTarget;

                    if (video.muted) {
                      video.muted = false;
                      video.volume = 1;
                      void video.play();
                    } else {
                      video.muted = true;
                    }
                  }}
                  aria-label="Intellia360 mascot introduction video"
                >
                  <source
                    src="/assets/home/mascot_home.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="hero-quest-footer">
                <div className="hero-quest-copy">
                  <strong>Your next challenge awaits.</strong>
                  <span>Learn a concept • Complete a challenge • Level up</span>
                </div>

                <span className="hero-quest-arrow" aria-hidden="true">→</span>
              </div>

            </div>

          </div>

        </div>
      </section>
      {/* ======================================================
          FEATURES
      ====================================================== */}

      {/* ======================================================
    WHY INTELLIA360
====================================================== */}

      {/* ======================================================
    WHY INTELLIA360 — COMPACT PRODUCT VISUALS
    Keep the existing section background/layout.
====================================================== */}
      <section className="features-section" id="learning">
        <div className="home-container">

          <div className="section-heading">
            <span className="section-eyebrow">WHY INTELLIA360?</span>

            <h2>
              Learning That Feels Like
              <span> an Adventure</span>
            </h2>

            <p>
              Everything students need to learn, practice, play and grow.
            </p>
          </div>

          <div className="features-grid features-grid-product">

            {features.map((feature, index) => (
              <article
                className={`feature-item feature-product-card feature-product-${index + 1}`}
                key={feature.title}
              >
                {/* Small CSS-built product visual — no external image/AI asset */}
                <div className="feature-product-visual" aria-hidden="true">
                  {index === 0 && (
                    <div className="feature-visual-path">
                      <span className="path-node path-node-main" />
                      <span className="path-line path-line-one" />
                      <span className="path-node path-node-two" />
                      <span className="path-line path-line-two" />
                      <span className="path-node path-node-three" />
                      <span className="path-target" />
                    </div>
                  )}

                  {index === 1 && (
                    <div className="feature-visual-xp">
                      <span className="xp-level">LEVEL 07</span>
                      <strong>+240 XP</strong>
                      <span className="xp-track">
                        <span />
                      </span>
                      <small>Challenge complete</small>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="feature-visual-lesson">
                      <span className="lesson-window-top">
                        <i /><i /><i />
                      </span>
                      <span className="lesson-play">›</span>
                      <span className="lesson-line lesson-line-one" />
                      <span className="lesson-line lesson-line-two" />
                    </div>
                  )}

                  {index === 3 && (
                    <div className="feature-visual-level">
                      <span className="level-ring">
                        <b>08</b>
                      </span>
                      <span className="level-copy">
                        <small>NEXT LEVEL</small>
                        <strong>1,240 XP</strong>
                      </span>
                    </div>
                  )}

                  {index === 4 && (
                    <div className="feature-visual-security">
                      <span className="security-shield">
                        <b />
                      </span>
                      <span className="security-status">
                        <strong>Protected</strong>
                        <small>Learning data</small>
                      </span>
                    </div>
                  )}

                  {index === 5 && (
                    <div className="feature-visual-ai">
                      <span className="ai-orbit ai-orbit-one" />
                      <span className="ai-orbit ai-orbit-two" />
                      <span className="ai-core">AI</span>
                      <span className="ai-message ai-message-one">Hint</span>
                      <span className="ai-message ai-message-two">Explain</span>
                    </div>
                  )}
                </div>

                <div className="feature-content">
                  <span className="feature-product-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>

                <span className="feature-product-arrow" aria-hidden="true">↗</span>
              </article>
            ))}

          </div>
        </div>

        <div className="feature-plane feature-plane-left" aria-hidden="true">➤</div>
        <div className="feature-plane feature-plane-right" aria-hidden="true">➤</div>
      </section>

      {/* ======================================================
          COURSES
      ====================================================== */}

      <section
        className="courses-section"
        id="courses"
      >

        <div className="home-container">

          <div className="section-heading courses-heading">

            <span className="section-eyebrow">
              OUR COURSES
            </span>

            <h2>
              Explore Math
              <span>
                {" "}Program
              </span>
            </h2>

            <p>
              Choose your grade and start your personalized
              math learning adventure.
            </p>

          </div>


          <div className="courses-carousel">




            <div className="courses-grid">

              {courses.slice(0, 4).map((course) => (

                <div
                  className={`course-card ${course.color}`}
                  key={course.grade}
                >

                  <div className="course-visual">

                    <div className="course-stars">
                      ✦
                    </div>


                    <div className="grade-badge">

                      <span className="grade-label">
                        GRADE
                      </span>

                      <strong>
                        {course.grade}
                      </strong>

                      <span className="badge-star">
                        ★
                      </span>

                    </div>


                    <div className="course-sparkle sparkle-one">
                      ✦
                    </div>

                    <div className="course-sparkle sparkle-two">
                      ✦
                    </div>

                  </div>


                  <div className="course-content">

                    <div className="course-meta">

                      <span>
                        {course.students}
                      </span>

                      <span className="course-price">
                        Explore
                      </span>

                    </div>


                    <h3>
                      {course.title}
                    </h3>


                    <p>
                      {course.subtitle}
                    </p>


                    <div className="course-info">

                      <span>
                        🎓 {course.students}
                      </span>

                      <span>
                        📚 {course.lessons}
                      </span>

                    </div>


                    <Link
                      href="/login"
                      className="course-button"
                    >
                      Start Learning →
                    </Link>

                  </div>

                </div>

              ))}

            </div>




          </div>


          <div className="courses-bottom">

            <div className="course-progress">

              <span className="active" />
              <span />
              <span />
              <span />
              <span />

            </div>


            <Link
              href="/courses"
              className="view-all-courses"
            >
              View All Courses
            </Link>

          </div>

        </div>

      </section>


      {/* ======================================================
          HOW IT WORKS
          Wonder → Story → Simulate → Play → Reflect
      ====================================================== */}

      <section
        className="how-section"
        id="how-it-works"
      >
        <div className="how-overlay" />

        <div className="home-container how-container">

          {/* =========================
        SECTION HEADING
    ========================== */}

          <div className="section-heading how-heading">

            <span className="section-eyebrow">
              YOUR LEARNING JOURNEY
            </span>

            <h2>
              How
              <span> Intellia360 </span>
              Works
            </h2>

            <p>
              Wonder. Discover. Explore. Play. Reflect.
            </p>

          </div>


          {/* =========================
        JOURNEY TIMELINE
    ========================== */}

          <div className="learning-journey">

            <div className="journey-line" />

            {steps.map((step, index) => (

              <div
                className={`journey-step ${index % 2 === 0
                  ? "journey-step-top"
                  : "journey-step-bottom"
                  }`}
                key={step.number}
              >

                {/* STEP CARD */}

                <div className="journey-card">

                  <div className="journey-image-wrap">

                    <div className="journey-image-glow" />

                    <img
                      src={step.image}
                      alt={step.title}
                      className="journey-image"
                    />

                  </div>

                  <div className="journey-card-content">

                    <span className="journey-number">
                      {String(step.number).padStart(2, "0")}
                    </span>

                    <h3>
                      {step.title}
                    </h3>

                    <p>
                      {step.text}
                    </p>

                  </div>

                </div>


                {/* TIMELINE DOT */}

                <div className="journey-node">

                  <span>
                    {index + 1}
                  </span>

                </div>


                {/* CONNECTOR */}

                {index < steps.length - 1 && (
                  <div className="journey-connector">
                    <span>→</span>
                  </div>
                )}

              </div>

            ))}

          </div>


          {/* =========================
        BOTTOM MESSAGE
    ========================== */}

          <div className="journey-bottom">

            <span className="journey-bottom-icon">
              ✦
            </span>

            <span>
              Learn. Play. Grow. Achieve.
            </span>

            <span className="journey-bottom-icon">
              ✦
            </span>

          </div>

        </div>
      </section>


      {/* ======================================================
          SHOWCASE
      ====================================================== */}

      {/* ======================================================
          EXPERIENCE INTELLIA360 — COMPACT GAMIFIED SHOWCASE
      ====================================================== */}
      <section
        className="showcase-section experience-section experience-compact-section"
        id="experience"
        aria-labelledby="experience-title"
      >
        <div className="home-container">
          <div className="experience-compact-head">
            <div>
              <div className="hero-eyebrow experience-compact-eyebrow">
                <span className="hero-eyebrow-dot" aria-hidden="true" />
                EXPERIENCE INTELLIA360
              </div>
              <h2 id="experience-title">
                Learn by <span>Exploring.</span>
              </h2>
              <p>
                Short, visual learning quests that make every concept easier to understand.
              </p>
            </div>
            <div className="experience-level-pill">
              <strong>03</strong>
              <span>Learning Quests</span>
            </div>
          </div>

          <div className="experience-compact-grid">
            {[
              {
                number: "01",
                label: "EXPLORE",
                title: "Visual Math",
                text: "Discover concepts through animation and examples.",
                video: "/assets/home/mascot_pytha.mp4",
                xp: "+120 XP",
              },
              {
                number: "02",
                label: "PRACTICE",
                title: "HCF Challenge",
                text: "Practice numbers and strengthen problem-solving skills.",
                video: "/assets/home/mascot_hcf.mp4",
                xp: "+180 XP",
              },
              {
                number: "03",
                label: "MASTER",
                title: "Integration",
                text: "Build confidence with guided visual examples.",
                video: "/assets/home/mascot_integration.mp4",
                xp: "+250 XP",
              },
            ].map((item) => (
              <article className="experience-compact-card" key={item.number}>
                <div className="experience-compact-video-wrap">
                  <video
                    className="experience-compact-video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    aria-label={`${item.title} learning preview`}
                  >
                    <source src={item.video} type="video/mp4" />
                  </video>
                  <span className="experience-compact-number">{item.number}</span>
                  <span className="experience-compact-xp">{item.xp}</span>
                  <span className="experience-compact-play" aria-hidden="true">▶</span>
                </div>

                <div className="experience-compact-copy">
                  <span className="experience-compact-label">{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="experience-compact-footer">
            <span className="experience-footer-line" aria-hidden="true" />
            <span>Explore</span>
            <span>→</span>
            <span>Practice</span>
            <span>→</span>
            <strong>Master</strong>
            <span className="experience-footer-line" aria-hidden="true" />
          </div>
        </div>
      </section>
      {/* ======================================================
          INTELLIAPLAY
      ====================================================== */}

      <section
        className="play-home-section"
        id="intelliaplay"
        aria-labelledby="play-home-title"
      >
        <div className="home-container">

          <div className="section-heading play-home-heading">
            <span className="section-eyebrow">🎮 INTELLIAPLAY</span>

            <h2 id="play-home-title">
              Practice That Feels
              <span> Like a Game</span>
            </h2>

            <p>
              IntelliaPlay is the play side of Intellia360 — quick challenges, daily
              quizzes, streaks and badges that turn practice into something students
              come back to.
            </p>
          </div>

          <div className="play-home-grid">

            <div className="play-home-modes">
              {playModes.map((mode) => (
                <article className="play-home-card" key={mode.title}>
                  <span className="play-home-icon" aria-hidden="true">{mode.icon}</span>
                  <h3>{mode.title}</h3>
                  <p>{mode.text}</p>
                </article>
              ))}
            </div>

            <div className="play-home-demo">

              <div className="play-home-demo-card" aria-hidden="true">
                <div className="play-home-demo-head">
                  <span className="play-home-tag">DAILY CHALLENGE</span>
                  <span className="play-home-count">Question 3 of 5</span>
                </div>

                <div className="play-home-progress">
                  <span />
                </div>

                <p className="play-home-question">What is ¾ of 20?</p>

                <div className="play-home-options">
                  <span>10</span>
                  <span>12</span>
                  <span className="is-correct">15 ✓</span>
                  <span>18</span>
                </div>

                <div className="play-home-reward">
                  <span>Correct — nice work!</span>
                  <strong>+25 XP</strong>
                </div>
              </div>

              <ul className="play-home-points" aria-label="IntelliaPlay highlights">
                <li><span aria-hidden="true">🔥</span> Daily streaks</li>
                <li><span aria-hidden="true">⭐</span> XP &amp; levels</li>
                <li><span aria-hidden="true">🏅</span> Unlockable badges</li>
              </ul>

              <div className="play-home-actions">
                <Link href="/intelliaplay" className="play-home-btn is-primary">
                  Explore IntelliaPlay <span aria-hidden="true">→</span>
                </Link>

                <Link href="/register" className="play-home-btn is-ghost">
                  Start Playing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          GAMIFIED STATS
      ====================================================== */}

      <section className="stats-section">

        <div className="home-container stats-grid">

          <div className="stat">

            <div className="stat-visual">
              🎓
            </div>

            <div>

              <strong>
                58K+
              </strong>

              <p>
                Students Enrolled
              </p>

            </div>

          </div>


          <div className="stat">

            <div className="stat-visual">
              ⭐
            </div>

            <div>

              <strong>
                25K+
              </strong>

              <p>
                Lessons Completed
              </p>

            </div>

          </div>


          <div className="stat">

            <div className="stat-visual">
              💎
            </div>

            <div>

              <strong>
                98%
              </strong>

              <p>
                Happy Learners
              </p>

            </div>

          </div>


          <div className="stat">

            <div className="stat-visual">
              🏫
            </div>

            <div>

              <strong>
                10K+
              </strong>

              <p>
                Schools & Institutes
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          AUDIENCES
      ====================================================== */}

      <section className="audience-section" id="parents">
        <div className="home-container">
          <div className="section-heading audience-heading">
            <span className="section-eyebrow">BUILT FOR EVERYONE</span>
            <h2>One Platform. <span>Every Learner Matters.</span></h2>
            <p>One connected ecosystem designed to support students, families, educators and learning organizations.</p>
          </div>

          <div className="audience-card-grid audience-grid-new">
            {audiences.map((audience) => (
              <article className={`audience-card audience-card-modern ${audience.color}`} key={audience.title}>
                <div className="audience-modern-icon" aria-hidden="true">{audience.icon}</div>
                <span className="audience-label">{audience.title === "For Students" ? "LEARNERS" : audience.title.replace("For ", "").toUpperCase()}</span>
                <h2>{audience.title}</h2>
                <p className="audience-description">{audience.description}</p>
                <ul>
                  {audience.points.map((point) => (
                    <li key={point}><span className="check-icon">✓</span>{point}</li>
                  ))}
                </ul>
                <Link href="/login" className="audience-btn">Explore <span>→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA
      ====================================================== */}

      <section className="cta-section">

        <div className="home-container">

          <div className="cta-card">

            <div className="cta-visual">

              <img
                src="/assets/home/rocket-3d.png"
                alt="Start learning adventure"
              />

            </div>


            <div className="cta-content">

              <span className="cta-eyebrow">
                ✨ YOUR NEXT ADVENTURE
              </span>


              <h2>

                Ready to Become a

                <span>
                  {" "}Math Champion?
                </span>

              </h2>


              <p>
                Learn. Play. Earn XP. Level up.
                Your math adventure starts here.
              </p>

            </div>


            <div className="cta-actions">

              <Link
                href="/login"
                className="cta-primary"
              >
                Start Learning →
              </Link>


              <Link
                href="#courses"
                className="cta-secondary"
              >
                Explore Intellia360
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          FOOTER
      ====================================================== */}


      {/* ======================================================
          LIVE LEADERBOARD — RIGHT SIDE DRAWER
          Uses the existing /api/student/leaderboard endpoint.
      ====================================================== */}
      <div className="homepage-leaderboard-widget">
        <button
          type="button"
          className={`homepage-leaderboard-tab ${leaderboardOpen ? "open" : ""}`}
          onClick={() => {
            setLeaderboardOpen((current) => !current);
            if (!leaderboardOpen && leaderboardEntries.length === 0) {
              fetchHomepageLeaderboard();
            }
          }}
          aria-expanded={leaderboardOpen}
          aria-controls="homepage-leaderboard-drawer"
          aria-label="Open leaderboard"
        >
          <span>LEADERBOARD</span>
        </button>

        <aside
          id="homepage-leaderboard-drawer"
          className={`homepage-leaderboard-drawer ${leaderboardOpen ? "open" : ""}`}
          aria-hidden={!leaderboardOpen}
        >
          <div className="homepage-leaderboard-header">
            <div className="homepage-leaderboard-title-wrap">
              <span className="homepage-leaderboard-trophy">🏆</span>
              <div>
                <span className="homepage-leaderboard-eyebrow">
                  LIVE RANKINGS
                </span>
                <h3>INTELLIA CHAMPIONS</h3>
              </div>
            </div>

            <button
              type="button"
              className="homepage-leaderboard-close"
              onClick={() => setLeaderboardOpen(false)}
              aria-label="Close leaderboard"
            >
              ×
            </button>
          </div>

          <div className="homepage-leaderboard-list">
            {leaderboardLoading ? (
              <div className="homepage-leaderboard-state">
                <span className="homepage-leaderboard-spinner" />
                <span>Loading rankings...</span>
              </div>
            ) : leaderboardEntries.length === 0 ? (
              <div className="homepage-leaderboard-state">
                <span className="homepage-leaderboard-state-icon">🏆</span>
                <span>No rankings available yet.</span>
              </div>
            ) : (
              leaderboardEntries.slice(0, 10).map((entry) => (
                <div
                  key={entry.rank}
                  className={`homepage-leaderboard-row ${entry.rank === 1
                    ? "rank-first"
                    : entry.rank === 2
                      ? "rank-second"
                      : entry.rank === 3
                        ? "rank-third"
                        : ""
                    }`}
                >
                  <div className="homepage-leaderboard-rank">
                    {entry.rank === 1
                      ? "🥇"
                      : entry.rank === 2
                        ? "🥈"
                        : entry.rank === 3
                          ? "🥉"
                          : `${entry.rank}th`}
                  </div>

                  <div className="homepage-leaderboard-student">
                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt=""
                        className="homepage-leaderboard-avatar"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="homepage-leaderboard-avatar-fallback">
                        {entry.name?.charAt(0).toUpperCase() || "S"}
                      </span>
                    )}

                    <div className="homepage-leaderboard-name-wrap">
                      <span className="homepage-leaderboard-name">
                        {entry.name}
                      </span>

                      {entry.isCurrentUser && (
                        <span className="homepage-leaderboard-you">YOU</span>
                      )}
                    </div>
                  </div>

                  <span className="homepage-leaderboard-xp">
                    ⭐ {Number(entry.xpPoints || 0).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <Link
            href="/student/leaderboard"
            className="homepage-view-leaderboard"
            onClick={() => setLeaderboardOpen(false)}
          >
            View Full Leaderboard
            <span>→</span>
          </Link>
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}