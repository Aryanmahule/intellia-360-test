"use client";

import React, { useState } from "react";
import Link from "next/link";
// FaLightbulb is defined locally further down this file, so it is not imported.
import { FaBookOpen, FaPuzzlePiece, FaSearch, FaTrophy } from "react-icons/fa";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";

import "./thinktales.css";

/* ============================================================
   THINKTALES STORY DATA
============================================================ */

interface Story {
    id: string;
    title: string;
    tagline: string;
    gradeRange: string;
    category: "early" | "junior" | "middle" | "senior";
    genre: "space" | "mystery" | "fantasy" | "time" | "nature";
    genreLabel: string;
    concept: string;
    conceptPills: string[];
    xp: number;
    duration: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    icon: string;
    coverGradient: string;
    badgeColor: string;
    puzzlesCount: number;
}

const storiesData: Story[] = [
    {
        id: "asteroid-split",
        title: "Captain Nova & The Asteroid Split",
        tagline: "Navigate the deep cosmos by calculating exact fraction thrusts to dodge meteor swarms.",
        gradeRange: "Grade 3 - 5",
        category: "junior",
        genre: "space",
        genreLabel: "Space Odyssey",
        concept: "Fractions & Decimals",
        conceptPills: ["Equivalent Fractions", "Fraction Addition", "Parts of a Whole"],
        xp: 150,
        duration: "12 mins",
        difficulty: "Intermediate",
        icon: "🚀",
        coverGradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
        badgeColor: "#3b82f6",
        puzzlesCount: 5,
    },
    {
        id: "missing-variable-detective",
        title: "The Mystery of the Missing Variable",
        tagline: "Inspector Prime must decode secret coded letters and solve algebraic equations to crack the vault.",
        gradeRange: "Grade 6 - 8",
        category: "middle",
        genre: "mystery",
        genreLabel: "Mystery & Detective",
        concept: "Algebraic Thinking & Linear Equations",
        conceptPills: ["One-Variable Equations", "Word Problems", "Pattern Recognition"],
        xp: 200,
        duration: "18 mins",
        difficulty: "Intermediate",
        icon: "🔍",
        coverGradient: "linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)",
        badgeColor: "#8b5cf6",
        puzzlesCount: 7,
    },
    {
        id: "kingdom-of-angles",
        title: "The Kingdom of Golden Angles",
        tagline: "Restore peace to the Polygon Realm by reconstructing the castle's missing geometric blueprints.",
        gradeRange: "Grade 6 - 8",
        category: "middle",
        genre: "fantasy",
        genreLabel: "Fantasy Realms",
        concept: "Geometry & Spatial Reasoning",
        conceptPills: ["Triangles & Quadrilaterals", "Interior Angles", "Symmetry & Rotation"],
        xp: 180,
        duration: "15 mins",
        difficulty: "Intermediate",
        icon: "🏰",
        coverGradient: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
        badgeColor: "#10b981",
        puzzlesCount: 6,
    },
    {
        id: "clockwork-time-traveler",
        title: "Chronicles of the Clockwork Traveler",
        tagline: "Calibrate the chronometer using speed, distance, and elapsed time to rescue historical milestones.",
        gradeRange: "Grade 4 - 6",
        category: "junior",
        genre: "time",
        genreLabel: "Time Travel",
        concept: "Time, Speed & Measurement",
        conceptPills: ["Elapsed Time", "Speed = Distance / Time", "Unit Conversions"],
        xp: 160,
        duration: "14 mins",
        difficulty: "Intermediate",
        icon: "⏳",
        coverGradient: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)",
        badgeColor: "#f59e0b",
        puzzlesCount: 5,
    },
    {
        id: "subtraction-safari",
        title: "The Great Subtraction Safari",
        tagline: "Help Ranger Leo count, sort, and safely transport animals across the savannah reserves.",
        gradeRange: "LKG - Grade 2",
        category: "early",
        genre: "nature",
        genreLabel: "Nature & Wildlife",
        concept: "Basic Arithmetic & Counting",
        conceptPills: ["Addition & Subtraction", "Grouping", "Visual Number Bonds"],
        xp: 100,
        duration: "8 mins",
        difficulty: "Beginner",
        icon: "🦁",
        coverGradient: "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)",
        badgeColor: "#ea580c",
        puzzlesCount: 4,
    },
    {
        id: "ratio-bazaar",
        title: "The Silk Road Ratio Bazaar",
        tagline: "Trade rare spices and exotic gems by balancing trade ratios and currency proportions.",
        gradeRange: "Grade 7 - 9",
        category: "middle",
        genre: "mystery",
        genreLabel: "Mystery & Adventure",
        concept: "Ratios, Rates & Proportions",
        conceptPills: ["Direct Proportions", "Unit Rates", "Scale Factors"],
        xp: 220,
        duration: "20 mins",
        difficulty: "Advanced",
        icon: "🏺",
        coverGradient: "linear-gradient(135deg, #831843 0%, #db2777 100%)",
        badgeColor: "#db2777",
        puzzlesCount: 8,
    },
    {
        id: "prime-number-forest",
        title: "Whispers of the Prime Forest",
        tagline: "Unlock magical guardian stone doors that only open for numbers with exactly two factors.",
        gradeRange: "Grade 5 - 7",
        category: "junior",
        genre: "fantasy",
        genreLabel: "Fantasy Realms",
        concept: "Number Theory & Primes",
        conceptPills: ["Prime vs Composite", "Factor Trees", "Divisibility Rules"],
        xp: 175,
        duration: "15 mins",
        difficulty: "Intermediate",
        icon: "🌲",
        coverGradient: "linear-gradient(135deg, #14532d 0%, #22c55e 100%)",
        badgeColor: "#22c55e",
        puzzlesCount: 6,
    },
    {
        id: "probability-casino-heist",
        title: "The Cipher Heist: Odds & Outcomes",
        tagline: "Outsmart the security algorithms by computing precise conditional probabilities and risk matrices.",
        gradeRange: "Grade 9 - 12",
        category: "senior",
        genre: "mystery",
        genreLabel: "Logic & Mystery",
        concept: "Probability & Statistics",
        conceptPills: ["Combinatorics", "Expected Value", "Bayesian Intuition"],
        xp: 300,
        duration: "25 mins",
        difficulty: "Advanced",
        icon: "🎲",
        coverGradient: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)",
        badgeColor: "#6366f1",
        puzzlesCount: 9,
    },
    {
        id: "coordinate-island-cartography",
        title: "Treasure Island Coordinate Quest",
        tagline: "Chart the hidden treasure on Captain Flint's four-quadrant map using Cartesian coordinates.",
        gradeRange: "Grade 5 - 8",
        category: "junior",
        genre: "nature",
        genreLabel: "Adventure Quest",
        concept: "Cartesian Coordinates & Slopes",
        conceptPills: ["4-Quadrant Graphing", "Distance Formula", "Reflections"],
        xp: 190,
        duration: "16 mins",
        difficulty: "Intermediate",
        icon: "🗺️",
        coverGradient: "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)",
        badgeColor: "#06b6d4",
        puzzlesCount: 6,
    },
];

const gradeCategories = [
    { id: "all", label: "All Tales" },
    { id: "early", label: "Early Explorers (LKG - G2)" },
    { id: "junior", label: "Junior Adventurers (G3 - G5)" },
    { id: "middle", label: "Middle Quest (G6 - G8)" },
    { id: "senior", label: "Senior Masters (G9 - G12)" },
];

const genreFilters = [
    { id: "all", label: "All Genres" },
    { id: "space", label: "🚀 Space" },
    { id: "mystery", label: "🔍 Mystery" },
    { id: "fantasy", label: "🏰 Fantasy" },
    { id: "time", label: "⏳ Time Travel" },
    { id: "nature", label: "🦁 Nature" },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function ThinkTalesPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedGenre, setSelectedGenre] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Interactive puzzle teaser state
    const [teaserAnswer, setTeaserAnswer] = useState<number | null>(null);
    const [teaserFeedback, setTeaserFeedback] = useState<string | null>(null);

    const filteredStories = storiesData.filter((story) => {
        const matchesCategory =
            selectedCategory === "all" || story.category === selectedCategory;
        const matchesGenre =
            selectedGenre === "all" || story.genre === selectedGenre;
        const matchesSearch =
            story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            story.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
            story.conceptPills.some((pill) =>
                pill.toLowerCase().includes(searchQuery.toLowerCase())
            );
        return matchesCategory && matchesGenre && matchesSearch;
    });

    const handleTeaserChoice = (optionIndex: number) => {
        setTeaserAnswer(optionIndex);
        if (optionIndex === 1) {
            setTeaserFeedback("✨ Brilliant! 2/6 + 3/6 = 5/6. Thrusters synchronized! +25 XP awarded!");
        } else {
            setTeaserFeedback("⚡ Not quite! Remember to find a common denominator before adding fuel fractions. Try option B!");
        }
    };

    return (
        <main className="thinktales-page">
            {/* ==================================================
                HEADER
            ================================================== */}
            <SiteHeader />

            {/* ==================================================
                HERO SECTION
            ================================================== */}
            <section className="thinktales-hero">
                <div className="thinktales-container thinktales-hero-grid">
                    {/* HERO CONTENT */}
                    <div className="thinktales-hero-content">
                        <span className="thinktales-eyebrow">
                            📖 IMMERSIVE STORY-DRIVEN MATHEMATICS
                        </span>

                        <h1>
                            Where Math Stories
                            <br />
                            <span>Become Epic Quests.</span>
                        </h1>

                        <p>
                            Step into thrilling animated adventures, solve mysteries, and
                            unlock plot twists using mathematical superpowers. ThinkTales
                            transforms abstract numbers into captivating stories learners
                            never forget.
                        </p>

                        {/* HERO BUTTONS */}
                        <div className="thinktales-hero-buttons">
                            <a href="#story-library" className="primary-tale-btn">
                                Explore Story Library ↓
                            </a>
                            <Link href="/login" className="secondary-tale-btn">
                                Start Free Tale →
                            </Link>
                        </div>

                        {/* HERO STATS BAR */}
                        <div className="thinktales-hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">50+</span>
                                <span className="stat-label">Story Quests</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-item">
                                <span className="stat-number">K-12</span>
                                <span className="stat-label">Aligned Grades</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-item">
                                <span className="stat-number">100%</span>
                                <span className="stat-label">Interactive Puzzles</span>
                            </div>
                        </div>
                    </div>

                    {/* HERO VISUAL */}
                    <div className="thinktales-hero-visual">
                        <div className="tale-mascot-card">
                            <div className="tale-mascot-badge">✨ Story-Led Math</div>
                            <div className="tale-mascot-emoji">🧙‍♂️</div>
                            <h3>The Sorcerer&apos;s Equation</h3>
                            <p>Unlock the enchanted runes with prime factors!</p>
                            <div className="tale-mascot-xp">
                                <span>⭐ +150 XP</span>
                                <span>⏱️ 10 min quest</span>
                            </div>
                        </div>

                        {/* FLOATING BADGES */}
                        <div className="floating-badge badge-top-left">
                            <span className="badge-icon">🚀</span>
                            <div className="badge-text">
                                <strong>Space Missions</strong>
                                <small>Fractions in Action</small>
                            </div>
                        </div>

                        <div className="floating-badge badge-top-right">
                            <span className="badge-icon">🔍</span>
                            <div className="badge-text">
                                <strong>Detective Cases</strong>
                                <small>Logic & Equations</small>
                            </div>
                        </div>

                        <div className="floating-badge badge-bottom-right">
                            <span className="badge-icon">🏆</span>
                            <div className="badge-text">
                                <strong>Earn Badges</strong>
                                <small>Level up your rank</small>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                HOW THINKTALES WORKS (3-STEP JOURNEY)
            ================================================== */}
            <section className="thinktales-how-it-works">
                <div className="thinktales-container">
                    <div className="section-heading">
                        <span className="section-tag">LEARNING METHODOLOGY</span>
                        <h2>
                            How ThinkTales Turns <span>Concepts Into Memory</span>
                        </h2>
                        <p>
                            Traditional drills teach formulas; ThinkTales builds deep
                            conceptual intuition through story context and interactive choice.
                        </p>
                    </div>

                    <div className="how-cards-grid">
                        <div className="how-card">
                            <div className="how-step-num">01</div>
                            <div className="how-icon-wrap" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                                <FaBookOpen />
                            </div>
                            <h3>Immersive Story World</h3>
                            <p>
                                Enter an engaging narrative where heroes face high-stakes
                                challenges requiring real problem-solving.
                            </p>
                        </div>

                        <div className="how-card">
                            <div className="how-step-num">02</div>
                            <div className="how-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
                                <FaPuzzlePiece />
                            </div>
                            <h3>In-Context Math Puzzles</h3>
                            <p>
                                Make meaningful mathematical decisions to solve dilemmas, open
                                locks, and guide the character&apos;s journey.
                            </p>
                        </div>

                        <div className="how-card">
                            <div className="how-step-num">03</div>
                            <div className="how-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
                                <FaTrophy />
                            </div>
                            <h3>Mastery, XP & Badges</h3>
                            <p>
                                Collect trophies, boost XP, and internalize core mathematical
                                concepts through emotional memory and gameplay.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                INTERACTIVE TEASER PUZZLE SHOWCASE
            ================================================== */}
            <section className="thinktales-teaser-section">
                <div className="thinktales-container">
                    <div className="teaser-box">
                        <div className="teaser-content">
                            <span className="teaser-badge">🎮 TRY A LIVE MINI-TALE</span>
                            <h2>Captain Nova&apos;s Asteroid Escape</h2>
                            <p className="teaser-scenario">
                                <em>
                                    &ldquo;Captain Nova is trapped in an asteroid belt! Booster Alpha
                                    needs <strong>1/3</strong> of the fuel cell, and Booster Beta needs{" "}
                                    <strong>3/6</strong>. What total fraction of fuel must be
                                    allocated to initiate the warp jump?&rdquo;
                                </em>
                            </p>

                            <div className="teaser-options">
                                <button
                                    type="button"
                                    className={`teaser-opt-btn ${teaserAnswer === 0 ? "wrong" : ""}`}
                                    onClick={() => handleTeaserChoice(0)}
                                >
                                    <span>A</span> 4/9 of fuel
                                </button>
                                <button
                                    type="button"
                                    className={`teaser-opt-btn ${teaserAnswer === 1 ? "correct" : ""}`}
                                    onClick={() => handleTeaserChoice(1)}
                                >
                                    <span>B</span> 5/6 of fuel (2/6 + 3/6)
                                </button>
                                <button
                                    type="button"
                                    className={`teaser-opt-btn ${teaserAnswer === 2 ? "wrong" : ""}`}
                                    onClick={() => handleTeaserChoice(2)}
                                >
                                    <span>C</span> 4/6 of fuel
                                </button>
                            </div>

                            {teaserFeedback && (
                                <div className={`teaser-feedback-card ${teaserAnswer === 1 ? "feedback-success" : "feedback-hint"}`}>
                                    {teaserFeedback}
                                </div>
                            )}
                        </div>

                        <div className="teaser-visual">
                            <div className="teaser-planet">🪐</div>
                            <div className="teaser-rocket">🚀</div>
                            <div className="teaser-glow" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                STORY LIBRARY / CATALOG
            ================================================== */}
            <section className="thinktales-library" id="story-library">
                <div className="thinktales-container">
                    <div className="section-heading">
                        <span className="section-tag">EXPLORE STORIES</span>
                        <h2>
                            The <span>ThinkTales Library</span>
                        </h2>
                        <p>
                            Choose your grade level, pick a genre, and start an interactive
                            mathematical adventure today.
                        </p>
                    </div>

                    {/* SEARCH & FILTERS */}
                    <div className="library-filters-wrap">
                        {/* SEARCH INPUT */}
                        <div className="search-bar-wrap">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by story, topic, or concept (e.g. Fractions, Algebra)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="story-search-input"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="clear-search-btn"
                                    onClick={() => setSearchQuery("")}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {/* GRADE TABS */}
                        <div className="grade-category-tabs">
                            {gradeCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`cat-tab-btn ${selectedCategory === cat.id ? "active" : ""}`}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* GENRE PILLS */}
                        <div className="genre-filter-pills">
                            {genreFilters.map((genre) => (
                                <button
                                    key={genre.id}
                                    type="button"
                                    className={`genre-pill-btn ${selectedGenre === genre.id ? "active" : ""}`}
                                    onClick={() => setSelectedGenre(genre.id)}
                                >
                                    {genre.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* STORY CARDS GRID */}
                    {filteredStories.length === 0 ? (
                        <div className="empty-stories-state">
                            <span className="empty-icon">📚</span>
                            <h3>No Stories Found</h3>
                            <p>Try clearing your search query or selecting a different filter category.</p>
                            <button
                                type="button"
                                className="reset-filter-btn"
                                onClick={() => {
                                    setSelectedCategory("all");
                                    setSelectedGenre("all");
                                    setSearchQuery("");
                                }}
                            >
                                Reset All Filters
                            </button>
                        </div>
                    ) : (
                        <div className="stories-grid">
                            {filteredStories.map((story) => (
                                <article key={story.id} className="story-card">
                                    {/* CARD COVER */}
                                    <div
                                        className="story-card-cover"
                                        style={{ background: story.coverGradient }}
                                    >
                                        <span className="story-icon-badge">{story.icon}</span>
                                        <div className="story-cover-tags">
                                            <span className="story-genre-tag">
                                                {story.genreLabel}
                                            </span>
                                            <span className="story-grade-tag">
                                                {story.gradeRange}
                                            </span>
                                        </div>
                                    </div>

                                    {/* CARD BODY */}
                                    <div className="story-card-body">
                                        <div className="story-concept-tag">
                                            <FaLightbulb className="concept-icon" />
                                            <span>{story.concept}</span>
                                        </div>

                                        <h3 className="story-title">{story.title}</h3>
                                        <p className="story-tagline">{story.tagline}</p>

                                        {/* CONCEPT PILLS */}
                                        <div className="story-concept-pills">
                                            {story.conceptPills.map((pill) => (
                                                <span key={pill} className="pill">
                                                    {pill}
                                                </span>
                                            ))}
                                        </div>

                                        {/* CARD STATS FOOTER */}
                                        <div className="story-card-meta">
                                            <div className="meta-left">
                                                <span>⏱️ {story.duration}</span>
                                                <span>🧩 {story.puzzlesCount} Puzzles</span>
                                            </div>
                                            <div className="meta-xp">
                                                ⭐ +{story.xp} XP
                                            </div>
                                        </div>

                                        {/* ACTION LINK */}
                                        <Link href="/login" className="story-launch-btn">
                                            Launch Story Quest
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ==================================================
                WHY STORY-BASED LEARNING WORKS (BENEFITS)
            ================================================== */}
            <section className="thinktales-benefits">
                <div className="thinktales-container">
                    <div className="section-heading">
                        <span className="section-tag">PEDAGOGICAL POWER</span>
                        <h2>
                            Why Students <span>Retain Math 3x Better</span> With Stories
                        </h2>
                        <p>
                            Backed by cognitive learning research, narrative context converts
                            abstract calculations into memorable mental models.
                        </p>
                    </div>

                    <div className="benefits-grid">
                        <div className="benefit-item">
                            <div className="benefit-icon">🧠</div>
                            <h3>Relatable Context</h3>
                            <p>
                                Math isn&apos;t just isolated equations — it becomes the tool that
                                rescues spaceships, decodes ancient treasures, and builds empires.
                            </p>
                        </div>

                        <div className="benefit-item">
                            <div className="benefit-icon">💡</div>
                            <h3>Zero Fear of Numbers</h3>
                            <p>
                                By wrapping challenges inside engaging narratives, anxiety melts away,
                                leaving curiosity, delight, and self-confidence.
                            </p>
                        </div>

                        <div className="benefit-item">
                            <div className="benefit-icon">🎯</div>
                            <h3>Adaptive Reasoning</h3>
                            <p>
                                Multi-layered branching stories challenge students to apply concepts
                                flexibly across different scenarios and problem types.
                            </p>
                        </div>

                        <div className="benefit-item">
                            <div className="benefit-icon">🔥</div>
                            <h3>Gamified Motivation</h3>
                            <p>
                                Earn XP, level up your adventurer profile, unlock new story arcs, and
                                compete on the Intellia360 Leaderboard.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                TESTIMONIALS SECTION
            ================================================== */}
            <section className="thinktales-testimonials">
                <div className="thinktales-container">
                    <div className="section-heading">
                        <span className="section-tag">LOVED BY LEARNERS & PARENTS</span>
                        <h2>
                            What Parents & Teachers <span>Are Saying</span>
                        </h2>
                    </div>

                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>
                                &ldquo;My 4th grader used to dread fractions. After playing Captain
                                Nova&apos;s space tale on ThinkTales, he explained fraction common
                                denominators to his younger sister using rocket fuel!&rdquo;
                            </p>
                            <div className="testimonial-author">
                                <strong>Meera K.</strong>
                                <span>Parent of 4th Grader, Mumbai</span>
                            </div>
                        </div>

                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>
                                &ldquo;ThinkTales bridges the gap between rote math homework and
                                authentic problem-solving. Our students eagerly look forward to
                                story quest days in the math lab.&rdquo;
                            </p>
                            <div className="testimonial-author">
                                <strong>Rajesh Sharma</strong>
                                <span>Middle School Math Educator, Pune</span>
                            </div>
                        </div>

                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>
                                &ldquo;The detective mystery on linear equations made algebra click
                                instantly for my daughter. It is interactive learning at its very
                                best!&rdquo;
                            </p>
                            <div className="testimonial-author">
                                <strong>Ananya Sen</strong>
                                <span>Parent, Bangalore</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                CTA BANNER
            ================================================== */}
            <section className="thinktales-cta-section">
                <div className="thinktales-container">
                    <div className="cta-banner-box">
                        <div className="cta-banner-content">
                            <h2>
                                Ready to Begin Your <span>Math Story Quest?</span>
                            </h2>
                            <p>
                                Join thousands of young learners who master mathematics
                                through play, logic, and storytelling.
                            </p>
                            <div className="cta-banner-buttons">
                                <Link href="/login" className="cta-primary-btn">
                                    Start Free Quest Now →
                                </Link>
                                <Link href="/courses" className="cta-secondary-btn">
                                    View All Courses
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                FOOTER
            ================================================== */}
            <SiteFooter />
        </main>
    );
}

function FaLightbulb(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 352 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M176 80c-52.94 0-96 43.06-96 96 0 8.84 7.16 16 16 16s16-7.16 16-16c0-35.3 28.72-64 64-64 8.84 0 16-7.16 16-16s-7.16-16-16-16zm176 96c0 42.66-16.53 81.7-43.85 111.1-14.59 15.7-24.15 35.76-27.41 56.9H143.26c-3.26-21.14-12.82-41.2-27.41-56.9C88.53 257.7 72 218.66 72 176 72 78.8 150.8 0 248 0s176 78.8 176 176zm-112 256h-64v16c0 17.67 14.33 32 32 32s32-14.33 32-32v-16zm64-32H112v-16c0-8.84 7.16-16 16-16h160c8.84 0 16 7.16 16 16v16z"></path>
        </svg>
    );
}
