import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import SchoolDemoForm from "@/components/common/SchoolDemoForm";
import "@/styles/site-pages.css";

export const metadata: Metadata = {
  title: "Intellia360 For Schools | Intellia360",
  description:
    "Bring Intellia360's gamified mathematics program into every classroom — student learning, a Teacher Console, school administration and progress reporting in one platform.",
};

const CONTACT_EMAIL = "contact@intellia360.com";

// Each point describes a part of the platform that exists today.
const AUDIENCES = [
  {
    icon: "🎓",
    tint: "",
    title: "For Students",
    points: [
      "Interactive, gamified maths lessons for their grade",
      "ThinkTales stories, practice quizzes and a daily challenge",
      "XP, streaks, badges and a leaderboard to stay motivated",
    ],
  },
  {
    icon: "👩‍🏫",
    tint: "is-violet",
    title: "For Teachers",
    points: [
      "A Teacher Console for classes, rosters and student profiles",
      "Assignments, attendance and classroom rewards",
      "Reports on progress, engagement and learners who need support",
      "An AI teaching assistant for insights and lesson ideas",
    ],
  },
  {
    icon: "🏫",
    tint: "is-orange",
    title: "For School Leaders",
    points: [
      "School onboarding with teacher and student account management",
      "Role-based access for students, parents, teachers and admins",
      "Platform-wide reports on learning activity",
    ],
  },
  {
    icon: "👨‍👩‍👧",
    tint: "is-green",
    title: "For Parents",
    points: [
      "Follow their child’s learning journey",
      "See progress, streaks and achievements",
      "Encourage consistent practice at home",
    ],
  },
];

const STEPS = [
  {
    icon: "📅",
    title: "Book a free demo",
    text: "Tell us about your school and we’ll walk you through the student experience and the Teacher Console.",
  },
  {
    icon: "🛠️",
    title: "Set up your school",
    text: "Your school is onboarded, and teacher and student accounts are created with the right roles.",
  },
  {
    icon: "🚀",
    title: "Start learning",
    text: "Teachers assign work and follow progress while students learn, play and level up.",
  },
];

const FAQS = [
  {
    q: "Which grades does the program cover?",
    a: "The Intellia360 Mathematics program spans LKG to Grade 12. LKG to Grade 5 are available now, and Grades 6 to 12 are coming shortly.",
  },
  {
    q: "What do teachers get?",
    a: "Every teacher gets the Teacher Console: class rosters and student profiles, assignments, attendance, rewards, reports and an AI teaching assistant.",
  },
  {
    q: "Can parents see their child’s progress?",
    a: "Yes. Parent accounts can open their child’s learning dashboard, including progress and achievements.",
  },
  {
    q: "How are student accounts kept secure?",
    a: "Passwords are stored hashed, sessions use secure HTTP-only cookies, and every account can only reach the parts of Intellia360 its role allows.",
  },
];

export default function SchoolsPage() {
  return (
    <main className="site-page">
      <SiteHeader />

      {/* HERO */}
      <section className="site-hero" aria-labelledby="schools-title">
        <div className="site-container site-hero-grid">
          <div>
            <span className="site-eyebrow">🏫 INTELLIA360 FOR SCHOOLS</span>

            <h1 id="schools-title">
              A Complete Math Ecosystem
              <br />
              <span>for Every Classroom.</span>
            </h1>

            <p className="site-lead">
              More than a digital learning platform, Intellia360 improves conceptual
              understanding, strengthens logical reasoning and develops critical
              thinking — while giving educators the tools to monitor progress and
              drive success.
            </p>

            <div className="site-hero-actions">
              <a href="#demo" className="site-btn site-btn--primary">
                Book A Free Demo →
              </a>
              <a href="#program" className="site-btn site-btn--ghost">
                Explore the Program ↓
              </a>
            </div>

            <ul className="site-hero-points" aria-label="Highlights">
              <li>📚 LKG – Grade 12</li>
              <li>🧑‍🏫 Teacher Console</li>
              <li>📊 Progress reports</li>
            </ul>
          </div>

          <div className="site-hero-visual">
            <div className="site-visual-card">
              <Image
                src="/assets/home/school.png"
                alt="Intellia360 School Program"
                width={650}
                height={360}
                priority
              />
            </div>

            <div className="site-visual-chip is-top" aria-hidden="true">
              <span className="chip-icon">📈</span>
              <span>
                <strong>Class progress</strong>
                <small>Tracked in real time</small>
              </span>
            </div>

            <div className="site-visual-chip is-bottom" aria-hidden="true">
              <span className="chip-icon is-orange">★</span>
              <span>
                <strong>Gamified learning</strong>
                <small>XP · Streaks · Badges</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAM */}
      <section className="site-section is-white" id="program" aria-labelledby="schools-program-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">Intellia 360 School Program</span>
            <h2 id="schools-program-title">
              One Platform for <span>Your Whole School</span>
            </h2>
            <p>
              Built for modern classrooms, the program personalises learning for every
              student and gives each person in the school the view they need.
            </p>
          </div>

          <div className="site-grid site-grid--4">
            {AUDIENCES.map((audience) => (
              <article className="site-card" key={audience.title}>
                <div className={`site-card-icon ${audience.tint}`} aria-hidden="true">
                  {audience.icon}
                </div>
                <h3>{audience.title}</h3>
                <ul>
                  {audience.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="site-section" aria-labelledby="schools-steps-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">Getting started</span>
            <h2 id="schools-steps-title">
              From Demo to <span>First Lesson</span>
            </h2>
          </div>

          <div className="site-grid site-grid--3">
            {STEPS.map((step, index) => (
              <article className="site-card" key={step.title}>
                <span className="site-step" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="site-card-icon" aria-hidden="true">
                  {step.icon}
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BOOK A DEMO */}
      <section className="site-section is-white" id="demo" aria-labelledby="schools-demo-title">
        <div className="site-container site-split is-top">
          <div>
            <span className="site-kicker">Book A Free Demo</span>
            <h2 id="schools-demo-title">
              See Intellia360 <span>in Your Classroom</span>
            </h2>
            <p>
              Share a few details and we’ll set up a walkthrough tailored to your school.
            </p>
            <ul className="site-checklist">
              <li>See the student experience — lessons, quizzes, streaks and badges.</li>
              <li>Walk through the Teacher Console and its progress reports.</li>
              <li>Talk through your grades, class sizes and timeline.</li>
            </ul>
          </div>

          <div className="site-form-card">
            <SchoolDemoForm />
          </div>
        </div>
      </section>

      {/* PARTNER */}
      <section className="site-section" id="partner" aria-labelledby="schools-partner-title">
        <div className="site-container">
          <div className="site-cta-box">
            <div>
              <span className="site-kicker" style={{ color: "#bfdbfe" }}>
                Partner With Us
              </span>
              <h2 id="schools-partner-title">Bring Intellia360 to More Learners</h2>
              <p>
                Coaching centres, school groups and education organisations can partner
                with Intellia360. Tell us what you have in mind.
              </p>
            </div>
            <div className="site-cta-actions">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Partnership enquiry")}`}
                className="site-btn site-btn--light"
              >
                Email Us About Partnering
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="site-section is-white" id="faqs" aria-labelledby="schools-faq-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">FAQs</span>
            <h2 id="schools-faq-title">
              Questions Schools <span>Often Ask</span>
            </h2>
          </div>

          <div className="site-faq">
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
            <details>
              <summary>How do we get started?</summary>
              <p>
                Book a free demo with the <a href="#demo">form above</a>, or email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, and our team will
                get in touch to plan your school’s onboarding.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="site-cta" aria-labelledby="schools-cta-title">
        <div className="site-container">
          <div className="site-cta-box">
            <div>
              <h2 id="schools-cta-title">Let’s Build Future-Ready Learners Together.</h2>
              <p>Explore the courses, or book a demo to see the full platform.</p>
            </div>
            <div className="site-cta-actions">
              <a href="#demo" className="site-btn site-btn--light">
                Book A Free Demo
              </a>
              <Link href="/courses" className="site-btn site-btn--outline-light">
                View Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
