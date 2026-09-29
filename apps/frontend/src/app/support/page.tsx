import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "@/styles/site-pages.css";

export const metadata: Metadata = {
  title: "Help & Support | Intellia360",
  description: "Answers to common Intellia360 questions — signing in, verification emails, grades, progress — and how to contact the team.",
};

const CONTACT_EMAIL = "contact@intellia360.com";

const HELP_TOPICS = [
  {
    icon: "🔑",
    tint: "",
    title: "Can’t sign in?",
    text: "Reset your password using the email you registered with. Reset links expire after one hour.",
    href: "/forgot-password",
    cta: "Reset password →",
  },
  {
    icon: "📧",
    tint: "is-orange",
    title: "No verification email?",
    text: "Check your spam folder, or request a fresh link. Verification links expire after 24 hours.",
    href: "/resend-verification",
    cta: "Resend verification →",
  },
  {
    icon: "🚀",
    tint: "is-green",
    title: "New to Intellia360?",
    text: "Create an account to start learning. Teacher, school and parent access is approved by an administrator.",
    href: "/register",
    cta: "Create an account →",
  },
  {
    icon: "🏫",
    tint: "is-violet",
    title: "Schools & partners",
    text: "Book a demo for your school, or talk to us about bringing Intellia360 to more learners.",
    href: "/schools#demo",
    cta: "Book a demo →",
  },
];

const FAQS = [
  {
    q: "How do I change my grade?",
    a: "Use the grade selector at the top of your learning dashboard. Your lessons and quizzes switch to the grade you pick.",
  },
  {
    q: "Where can I see my progress and rewards?",
    a: "My Learning shows your current lesson and progress, Achievements shows the badges you have unlocked, and the Leaderboard shows where your XP ranks.",
  },
  {
    q: "I asked for a teacher account but I see the student dashboard.",
    a: "Every new account starts as a student account while an administrator reviews the role you requested. Once it is approved, sign out and sign back in to open your new dashboard.",
  },
  {
    q: "Why was I asked to sign in again?",
    a: "Signing out in one tab signs you out in every tab of that browser, and signing in as someone else replaces the account in all of them. Sign in again with the account you want to use.",
  },
];

export default function SupportPage() {
  return (
    <main className="site-page">
      <SiteHeader />

      <section className="site-doc-hero" aria-labelledby="support-title">
        <div className="site-container">
          <span className="site-eyebrow">💬 HELP CENTRE</span>
          <h1 id="support-title">Help &amp; Support</h1>
          <p>Find quick answers to common questions, or get in touch with the Intellia360 team.</p>
        </div>
      </section>

      <section className="site-doc" aria-label="Help topics">
        <div className="site-container">
          <div className="site-grid site-grid--4">
            {HELP_TOPICS.map((topic) => (
              <article className="site-card" key={topic.title}>
                <div className={`site-card-icon ${topic.tint}`} aria-hidden="true">
                  {topic.icon}
                </div>
                <h2 style={{ margin: "16px 0 0", fontSize: 18, fontWeight: 800 }}>{topic.title}</h2>
                <p>{topic.text}</p>
                <Link href={topic.href} className="site-card-link">
                  {topic.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section is-white" aria-labelledby="support-faq-title">
        <div className="site-container">
          <div className="site-section-head">
            <span className="site-kicker">FAQs</span>
            <h2 id="support-faq-title">
              Common <span>Questions</span>
            </h2>
          </div>

          <div className="site-faq">
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="site-cta" aria-labelledby="support-contact-title">
        <div className="site-container">
          <div className="site-cta-box">
            <div>
              <h2 id="support-contact-title">Still Need Help?</h2>
              <p>
                Email {CONTACT_EMAIL} and include the email address of your account.
                Intellia360 · Pune, Maharashtra, India.
              </p>
            </div>
            <div className="site-cta-actions">
              <a href={`mailto:${CONTACT_EMAIL}`} className="site-btn site-btn--light">
                Email Support
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
