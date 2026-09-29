"use client";
import { useState, useEffect, useMemo } from "react";
import type { DashboardHeroSlide } from "@intellia360/shared/types/student";

const HERO_BACKGROUND_IMAGES = [
  "/assets/images/image1.png",
  "/assets/images/image2.png",
  "/assets/images/image3.png",
  "/assets/images/image4.png",
];

interface HeroSectionContainerProps {
  slide?: DashboardHeroSlide;
  slides?: DashboardHeroSlide[];
  totalSlides?: number;
  activeSlideIndex?: number;
  activeLessonId?: string;
  onCtaClick?: (slide: DashboardHeroSlide, slideIndex: number) => void;
}



// Particles for the floating effects
const HERO_PARTICLES = ["✨", "⭐", "+", "×", "=", "💡", "🔢", "✦"];

export default function HeroSectionContainer({
  slide,
  slides: inputSlides,
  totalSlides = 4,
  activeSlideIndex: initialSlideIndex = 0,
  activeLessonId = "",
  onCtaClick,
}: HeroSectionContainerProps) {
  // Construct array of slides
  const slides: DashboardHeroSlide[] = inputSlides && inputSlides.length > 0
    ? inputSlides
    : slide
      ? [slide]
      : [];

  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);
  const [motivationIndex, setMotivationIndex] = useState(0);

  // Reset slide index when active lesson changes
  useEffect(() => {
    setActiveIndex(0);
  }, [activeLessonId]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, activeLessonId]);



  const currentSlide = slides[activeIndex] || slides[0] || slide;
  const slideCount = slides.length || totalSlides;

  if (!currentSlide) return null;

  const hundreds = (currentSlide.visualizerData?.hundreds as number) ?? 1;
  const tens = (currentSlide.visualizerData?.tens as number) ?? 3;
  const ones = (currentSlide.visualizerData?.ones as number) ?? 5;
  const number = (currentSlide.visualizerData?.number as number) ?? (hundreds * 100 + tens * 10 + ones);

  const handleCtaClick = (e: React.MouseEvent) => {
    if (onCtaClick) {
      onCtaClick(currentSlide, activeIndex);
    }
  };

  return (
    <section
      className="hero-section-container"
      style={{
        backgroundImage: `url("${HERO_BACKGROUND_IMAGES[
          activeIndex % HERO_BACKGROUND_IMAGES.length
        ]}")`,
        backgroundSize: "cover",
        backgroundPosition: "30% center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Floating Particles Layer */}
      <div className="hero-particles-layer">
        {HERO_PARTICLES.map((particle, idx) => (
          <span key={idx} className="hero-particle">{particle}</span>
        ))}
      </div>

      {/* Left Content */}
      <div
        key={`hero-banner-${activeIndex}-${activeLessonId}`}
        className="hero-banner-content"
      >
        <div className="hero-tag-ribbon">
          <span className="star-icon">⭐</span> {currentSlide.tag}
        </div>

        <h1 className="hero-title">{currentSlide.title}</h1>
        <p className="hero-subtitle">{currentSlide.subtitle}</p>

        <div className="hero-mascot-cta">


          {currentSlide.ctaUrl ? (
            <a
              href={currentSlide.ctaUrl}
              className="btn-primary-hero"
              style={{ textDecoration: "none", display: "inline-flex" }}
              onClick={handleCtaClick}
            >
              ▶ {currentSlide.ctaText}
            </a>
          ) : (
            <button className="btn-primary-hero" onClick={handleCtaClick}>
              ▶ {currentSlide.ctaText}
            </button>
          )}


        </div>

        <div className="carousel-dots-group">
          {Array.from({ length: slideCount }).map((_, idx) => (
            <span
              key={idx}
              role="button"
              tabIndex={0}
              aria-label={`Slide ${idx + 1}`}
              className={`carousel-dot ${idx === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveIndex(idx);
                }
              }}
              style={{ cursor: "pointer" }}
            />
          ))}
        </div>
      </div>

      {/* Right Visualizer */}
      <div className="hero-visualizer-slot">
        <div
          key={`hero-vis-${activeIndex}-${activeLessonId}`}
          className="math-visualizer-card"
        >
          {renderVisualizerScene(currentSlide)}
        </div>
      </div>
    </section>
  );
}


function renderVisualizerScene(slide: DashboardHeroSlide) {
  const key = (slide.visualizerKey || "").toLowerCase();
  const title = (slide.title || "").toLowerCase();

  if (key.includes("triangle") || title.includes("triangle")) {
    return <TriangleVisualizerScene />;
  }

  if (key.includes("circle") || title.includes("circle")) {
    return <CircleVisualizerScene />;
  }

  if (
    key.includes("symmetry") ||
    title.includes("symmetry") ||
    title.includes("pattern")
  ) {
    return <SymmetryVisualizerScene />;
  }

  if (
    key.includes("fraction") ||
    title.includes("fraction") ||
    title.includes("group")
  ) {
    return <FractionsVisualizerScene />;
  }

  if (
    key.includes("money") ||
    title.includes("money") ||
    title.includes("coin") ||
    title.includes("word problem")
  ) {
    return <MoneyVisualizerScene />;
  }

  if (
    key.includes("measure") ||
    title.includes("measure") ||
    title.includes("length")
  ) {
    return <MeasurementVisualizerScene />;
  }

  if (
    key.includes("time") ||
    title.includes("time") ||
    title.includes("clock")
  ) {
    return <TimeVisualizerScene />;
  }

  const hundreds =
    (slide.visualizerData?.hundreds as number) ?? 1;

  const tens =
    (slide.visualizerData?.tens as number) ?? 3;

  const ones =
    (slide.visualizerData?.ones as number) ?? 5;

  const number =
    (slide.visualizerData?.number as number) ??
    hundreds * 100 + tens * 10 + ones;

  return (
    <PlaceValueVisualizerScene
      hundreds={hundreds}
      tens={tens}
      ones={ones}
      number={number}
    />
  );
}
/* ═══════════════════════════════════════════════════════
   GAMIFIED HERO VISUALIZERS
   ═══════════════════════════════════════════════════════ */

function VisualBadge({
  icon,
  children,
  className = "",
}: {
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hero-visual-badge ${className}`}>
      <span>{icon}</span>
      {children}
    </div>
  );
}


/* ─────────────────────────────────────────────────────
   PLACE VALUE / COUNTING
   ───────────────────────────────────────────────────── */

function PlaceValueVisualizerScene({
  hundreds,
  tens,
  ones,
  number,
}: {
  hundreds: number;
  tens: number;
  ones: number;
  number: number;
}) {
  return (
    <div className="gamified-visual place-value-visual">

      <div className="visual-floating-star star-one">✦</div>
      <div className="visual-floating-star star-two">✦</div>

      <VisualBadge icon="🏆" className="xp-badge">
        +20 XP
      </VisualBadge>

      <div className="visual-main-title">
        <span>🔢</span>
        Number Quest
      </div>

      <div className="number-blocks">

        <div className="number-group hundreds-group">
          <div className="hundred-cube">
            <div className="cube-grid" />
            <span>100</span>
          </div>

          <small>Hundreds</small>
        </div>

        <div className="number-group">
          <div className="ten-rods">
            {Array.from({
              length: Math.min(tens, 5),
            }).map((_, i) => (
              <div className="ten-rod" key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} />
                ))}
              </div>
            ))}
          </div>

          <strong>{tens * 10}</strong>
          <small>Tens</small>
        </div>

        <div className="number-group">
          <div className="one-cubes">
            {Array.from({
              length: Math.min(ones, 6),
            }).map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>

          <strong>{ones}</strong>
          <small>Ones</small>
        </div>

      </div>

      <div className="number-equation">
        <span>{hundreds * 100}</span>
        <b>+</b>
        <span>{tens * 10}</span>
        <b>+</b>
        <span>{ones}</span>
        <b>=</b>
        <strong>{number}</strong>
      </div>

      <VisualBadge icon="⭐">
        Great job!
      </VisualBadge>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   TRIANGLE
   ───────────────────────────────────────────────────── */

function TriangleVisualizerScene() {
  return (
    <div className="gamified-visual geometry-visual">

      <VisualBadge icon="🏆" className="xp-badge">
        +25 XP
      </VisualBadge>

      <div className="visual-main-title">
        🔺 Shape Explorer
      </div>

      <div className="triangle-stage">

        <div className="triangle-shape">
          <span className="vertex vertex-a">A</span>
          <span className="vertex vertex-b">B</span>
          <span className="vertex vertex-c">C</span>
        </div>

        <div className="angle-bubble angle-a">
          60°
        </div>

        <div className="angle-bubble angle-b">
          60°
        </div>

        <div className="angle-bubble angle-c">
          60°
        </div>

      </div>

      <div className="visual-answer">
        🔺 3 sides · 3 angles
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   CIRCLE
   ───────────────────────────────────────────────────── */

function CircleVisualizerScene() {
  return (
    <div className="gamified-visual geometry-visual">

      <VisualBadge icon="💎" className="xp-badge">
        +20 XP
      </VisualBadge>

      <div className="visual-main-title">
        🟢 Circle Explorer
      </div>

      <div className="circle-stage">

        <div className="glow-circle">

          <div className="circle-center">
            •
          </div>

          <div className="radius-line" />

          <span className="radius-label">
            Radius
          </span>

          <span className="center-label">
            Center
          </span>

        </div>

      </div>

      <div className="visual-answer">
        🎯 Center + Radius + Diameter
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   SYMMETRY
   ───────────────────────────────────────────────────── */

function SymmetryVisualizerScene() {
  return (
    <div className="gamified-visual symmetry-visual">

      <VisualBadge icon="✨" className="xp-badge">
        +30 XP
      </VisualBadge>

      <div className="visual-main-title">
        🪞 Mirror Magic
      </div>

      <div className="symmetry-stage">

        <div className="symmetry-shape left">
          <span>♥</span>
        </div>

        <div className="mirror-line">
          <span>↕</span>
        </div>

        <div className="symmetry-shape right">
          <span>♥</span>
        </div>

      </div>

      <div className="visual-answer">
        ✨ Perfectly Symmetrical!
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   FRACTIONS
   ───────────────────────────────────────────────────── */

function FractionsVisualizerScene() {
  return (
    <div className="gamified-visual fraction-visual">

      <VisualBadge icon="🏆" className="xp-badge">
        +30 XP
      </VisualBadge>

      <div className="visual-main-title">
        🍕 Fraction Quest
      </div>

      <div className="pizza-stage">

        <div className="pizza">

          <div className="pizza-slice slice-one" />
          <div className="pizza-slice slice-two" />
          <div className="pizza-slice slice-three" />
          <div className="pizza-slice slice-four" />

        </div>

        <div className="fraction-center">
          3/4
        </div>

      </div>

      <div className="visual-answer">
        🍕 3 of 4 parts selected
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   MONEY
   ───────────────────────────────────────────────────── */

function MoneyVisualizerScene() {
  return (
    <div className="gamified-visual money-visual">

      <VisualBadge icon="💰" className="xp-badge">
        +25 XP
      </VisualBadge>

      <div className="visual-main-title">
        💰 Money Mission
      </div>

      <div className="coins-stage">

        <div className="coin coin-gold">
          $1
        </div>

        <div className="plus-sign">
          +
        </div>

        <div className="coin coin-silver">
          25¢
        </div>

        <div className="equals-sign">
          =
        </div>

        <div className="money-total">
          $1.25
        </div>

      </div>

      <div className="visual-answer">
        💰 Money Master!
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   MEASUREMENT
   ───────────────────────────────────────────────────── */

function MeasurementVisualizerScene() {
  return (
    <div className="gamified-visual measurement-visual">

      <VisualBadge icon="📏" className="xp-badge">
        +20 XP
      </VisualBadge>

      <div className="visual-main-title">
        📏 Measure It!
      </div>

      <div className="ruler-stage">

        <div className="ruler">

          {Array.from({ length: 11 }).map((_, i) => (
            <span
              key={i}
              className={i % 5 === 0 ? "major-tick" : ""}
            >
              {i}
            </span>
          ))}

        </div>

        <div className="measurement-arrow">
          ↔ 8 cm
        </div>

      </div>

      <div className="visual-answer">
        🎯 Measure like a pro!
      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────
   TIME
   ───────────────────────────────────────────────────── */

function TimeVisualizerScene() {
  return (
    <div className="gamified-visual time-visual">

      <VisualBadge icon="⏰" className="xp-badge">
        +20 XP
      </VisualBadge>

      <div className="visual-main-title">
        ⏰ Time Explorer
      </div>

      <div className="clock-stage">

        <div className="game-clock">

          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="clock-number"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-45px)`,
              }}
            >
              <span
                style={{
                  transform: `rotate(-${i * 30}deg)`,
                }}
              >
                {i + 1}
              </span>
            </span>
          ))}

          <div className="clock-hand hour-hand" />
          <div className="clock-hand minute-hand" />

          <div className="clock-center" />

        </div>

      </div>

      <div className="visual-answer">
        🕒 It's 3 o'clock!
      </div>

    </div>
  );
}