"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import GradeParamSync from "./GradeParamSync";


import "./courses.css";

/* ============================================================
   COURSES / GRADES
============================================================ */

const grades = [
    {
        id: "lkg",
        title: "LKG",
        description: "Fun learning for little learners",
        icon: "🧸",
    },
    {
        id: "ukg",
        title: "UKG",
        description: "Learn through play and activities",
        icon: "🌈",
    },

    {
        id: "grade1",
        title: "Grade 1",
        description: "Build strong mathematical foundations",
        icon: "📘",
    },
    {
        id: "grade2",
        title: "Grade 2",
        description: "Explore numbers and problem solving",
        icon: "🔢",
    },
    {
        id: "grade3",
        title: "Grade 3",
        description: "Learn, practice and discover",
        icon: "🧩",
    },
    {
        id: "grade4",
        title: "Grade 4",
        description: "Strengthen concepts through practice",
        icon: "🚀",
    },
    {
        id: "grade5",
        title: "Grade 5",
        description: "Master concepts with interactive learning",
        icon: "⭐",
    },

    {
        id: "grade6",
        title: "Grade 6",
        description: "Develop deeper mathematical thinking",
        icon: "🎯",
    },
    {
        id: "grade7",
        title: "Grade 7",
        description: "Practice concepts with confidence",
        icon: "🎮",
    },
    {
        id: "grade8",
        title: "Grade 8",
        description: "Learn through challenges and activities",
        icon: "💡",
    },
    {
        id: "grade9",
        title: "Grade 9",
        description: "Build advanced problem-solving skills",
        icon: "🧠",
    },
    {
        id: "grade10",
        title: "Grade 10",
        description: "Prepare and master important concepts",
        icon: "🏆",
    },
    {
        id: "grade11",
        title: "Grade 11",
        description: "Explore advanced mathematics",
        icon: "📊",
    },
    {
        id: "grade12",
        title: "Grade 12",
        description: "Master concepts and prepare for exams",
        icon: "🎓",
    },
];


/* ============================================================
   WHY INTELLIA360
   SAME CONTENT AS HOMEPAGE
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
   PAGE
============================================================ */

export default function CoursesPage() {
    const [gradePage, setGradePage] = useState(0);

    const gradesPerPage = 4;

    const totalGradePages = Math.ceil(
        grades.length / gradesPerPage
    );

    const visibleGrades = grades.slice(
        gradePage * gradesPerPage,
        gradePage * gradesPerPage + gradesPerPage
    );

    // Opened from a grade link (/courses?grade=grade3): start on that grade's page.
    const showGrade = useCallback((gradeId: string) => {
        const index = grades.findIndex((grade) => grade.id === gradeId);
        if (index >= 0) setGradePage(Math.floor(index / gradesPerPage));
    }, [gradesPerPage]);

    return (
        <main className="courses-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <SiteHeader />

            <Suspense fallback={null}>
                <GradeParamSync onGrade={showGrade} />
            </Suspense>


            {/* ==================================================
                HERO
            ================================================== */}

            <section className="courses-hero">

                <div className="courses-container courses-hero-grid">

                    {/* HERO CONTENT */}

                    <div className="courses-hero-content">

                        <span className="courses-eyebrow">
                            🎓 LEARN • PLAY • MASTER
                        </span>

                        <h1>
                            Explore Courses
                            <br />
                            <span>
                                Made for Every Learner.
                            </span>
                        </h1>

                        <p>
                            Discover engaging, interactive and gamified
                            mathematics learning designed for learners
                            from LKG to Grade 12.
                        </p>


                        {/* HERO BUTTONS */}

                        <div className="courses-hero-buttons">

                            <a
                                href="#all-courses"
                                className="primary-course-btn"
                            >
                                Explore Courses ↓
                            </a>

                            <Link
                                href="/login"
                                className="secondary-course-btn"
                            >
                                Start Learning →
                            </Link>

                        </div>

                    </div>


                    {/* HERO VISUAL */}

                    <div className="courses-hero-visual">

                        <div className="course-emoji-card">
                            🚀
                        </div>

                        <div className="floating-course-card card-one">
                            🧮
                            <span>
                                Interactive Math
                            </span>
                        </div>

                        <div className="floating-course-card card-two">
                            ⭐
                            <span>
                                Earn XP & Rewards
                            </span>
                        </div>

                        <div className="floating-course-card card-three">
                            🧠
                            <span>
                                Learn Smarter
                            </span>
                        </div>

                    </div>

                </div>

            </section>


            {/* ==================================================
                COURSE SELECTION
            ================================================== */}

            <section className="course-selection">

                <div className="courses-container">

                    {/* SECTION HEADING */}

                    <div className="section-heading">

                        <span>
                            FIND YOUR COURSE
                        </span>

                        <h2>
                            Choose Your{" "}
                            <span>
                                Grade
                            </span>
                        </h2>

                        <p>
                            Select your grade and start your learning adventure.
                        </p>

                    </div>


                    {/* ==================================================
                        GRADE CARDS
                    ================================================== */}

                    {/* ==================================================
    GRADE CAROUSEL
================================================== */}

                    <div className="grade-carousel">

                        {/* LEFT ARROW */}
                        <button
                            type="button"
                            className="grade-carousel-arrow grade-arrow-left"
                            onClick={() =>
                                setGradePage((prev) =>
                                    prev === 0 ? totalGradePages - 1 : prev - 1
                                )
                            }
                            aria-label="Previous grades"
                        >
                            ←
                        </button>


                        {/* CARDS */}
                        <div className="grade-grid" id="all-courses">

                            {visibleGrades.map((grade, index) => (
                                <article
                                    className={`grade-card grade-card-${index % 4} ${["yellow", "purple", "blue", "green"][index % 4]}`}
                                    key={grade.id}
                                >

                                    {/* TOP COLOURED AREA */}
                                    <div className="grade-card-top">

                                        <span className="grade-decoration star-left">
                                            ✦
                                        </span>

                                        <span className="grade-decoration star-right">
                                            ✦
                                        </span>

                                        <span className="grade-decoration star-bottom">
                                            ✦
                                        </span>


                                        {/* GRADE CIRCLE */}
                                        <div className="grade-circle">

                                            <small>GRADE</small>

                                            <strong>
                                                {grade.title
                                                    .replace("Grade ", "")
                                                    .toUpperCase()}
                                            </strong>

                                        </div>


                                        {/* STAR BADGE */}
                                        <span className="star-badge">
                                            ★
                                        </span>

                                    </div>


                                    {/* CARD CONTENT */}
                                    <div className="grade-content">

                                        <div className="grade-card-header">

                                            <span className="grade-category">
                                                {grade.id === "lkg" || grade.id === "ukg"
                                                    ? "Early Learners"
                                                    : grade.id === "grade1" ||
                                                        grade.id === "grade2"
                                                        ? "Primary"
                                                        : "Middle & Senior"}

                                            </span>

                                            <span className="grade-explore">
                                                Explore
                                            </span>

                                        </div>


                                        <h3>
                                            {grade.title} Mathematics
                                        </h3>


                                        <p className="grade-description">
                                            {grade.id === "lkg"
                                                ? "Numbers • Shapes • Patterns"
                                                : grade.id === "ukg"
                                                    ? "Counting • Addition • Shapes"
                                                    : grade.id === "grade1"
                                                        ? "Numbers • Counting • Addition"
                                                        : grade.id === "grade2"
                                                            ? "Addition • Subtraction • Patterns"
                                                            : grade.description}
                                        </p>


                                        {/* DIVIDER */}
                                        <div className="grade-divider" />


                                        {/* META */}
                                        <div className="course-meta">

                                            <span>
                                                🎓{" "}
                                                {grade.id === "lkg" || grade.id === "ukg"
                                                    ? "Early Learners"
                                                    : grade.id === "grade1" ||
                                                        grade.id === "grade2"
                                                        ? "Primary"
                                                        : "Advanced Learning"}
                                            </span>

                                            <span>
                                                📚{" "}
                                                {12 + index * 2}+ Lessons
                                            </span>

                                        </div>


                                        {/* BUTTON */}
                                        <Link
                                            href={`/login?grade=${grade.id}`}
                                            className="grade-btn"
                                        >
                                            Start Learning →
                                        </Link>

                                    </div>

                                </article>
                            ))}

                        </div>


                        {/* RIGHT ARROW */}
                        <button
                            type="button"
                            className="grade-carousel-arrow grade-arrow-right"
                            onClick={() =>
                                setGradePage((prev) =>
                                    prev === totalGradePages - 1 ? 0 : prev + 1
                                )
                            }
                            aria-label="Next grades"
                        >
                            →
                        </button>

                    </div>


                    {/* ==================================================
    CAROUSEL BOTTOM
================================================== */}

                    <div className="grade-carousel-bottom">

                        <div className="grade-dots">

                            {Array.from({ length: totalGradePages }).map((_, index) => (
                                <button
                                    type="button"
                                    key={index}
                                    className={`grade-dot ${gradePage === index ? "active" : ""
                                        }`}
                                    onClick={() => setGradePage(index)}
                                    aria-label={`Go to grade page ${index + 1}`}
                                />
                            ))}

                        </div>




                    </div>
                </div>

            </section>


            {/* ======================================================
                WHY INTELLIA360
                EXACT SAME SECTION AS HOMEPAGE
            ====================================================== */}

            <section
                className="features-section"
                id="learning"
            >

                <div className="courses-container">

                    {/* SECTION HEADING */}

                    <div className="section-heading">

                        <span className="section-eyebrow">
                            WHY INTELLIA360?
                        </span>

                        <h2>
                            Learning That Feels Like
                            <span>
                                {" "}an Adventure
                            </span>
                        </h2>

                        <p>
                            Everything students need to learn,
                            practice, play and grow.
                        </p>

                    </div>


                    {/* FEATURES */}

                    <div className="features-grid">

                        {features.map((feature) => (

                            <div
                                className="feature-item"
                                key={feature.title}
                            >

                                <div className="feature-content">

                                    <h3>
                                        {feature.title}
                                    </h3>

                                    <p>
                                        {feature.text}
                                    </p>

                                </div>

                            </div>

                        ))}

                    </div>

                </div>


                {/* DECORATIVE PAPER PLANES */}

                <div className="feature-plane feature-plane-left">
                    ➤
                </div>

                <div className="feature-plane feature-plane-right">
                    ➤
                </div>

            </section>


            {/* ======================================================
                CTA
            ====================================================== */}

            <section className="courses-cta">

                <div className="courses-container">

                    <div>

                        <span>
                            🚀 READY TO START?
                        </span>

                        <h2>
                            Start Your Learning Adventure.
                        </h2>

                        <p>
                            Choose your grade and begin learning
                            with Intellia360.
                        </p>

                    </div>


                    <Link
                        href="/login"
                        className="cta-course-btn"
                    >
                        Start Learning →
                    </Link>

                </div>

            </section>


            {/* ======================================================
                FOOTER
                SAME HOMEPAGE STYLE
            ====================================================== */}

            <SiteFooter />

        </main>
    );
}