import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "@/styles/site-pages.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Intellia360",
  description: "A plain-language summary of the information Intellia360 handles, why, and how it is protected.",
};

const CONTACT_EMAIL = "contact@intellia360.com";

// A factual summary of how the platform handles data today. The complete,
// legally reviewed policy text is still to be supplied by the business.
export default function PrivacyPage() {
  return (
    <main className="site-page">
      <SiteHeader />

      <section className="site-doc-hero" aria-labelledby="privacy-title">
        <div className="site-container">
          <span className="site-eyebrow">🔒 YOUR DATA</span>
          <h1 id="privacy-title">Privacy Policy</h1>
          <p>What information Intellia360 handles, why we need it, and how it is protected.</p>
          <p className="site-doc-meta">Last updated: 10 September 2026</p>
        </div>
      </section>

      <section className="site-doc">
        <div className="site-container site-doc-body">
          <p className="site-doc-note">
            This page is a plain-language summary of how Intellia360 handles personal
            information. For the complete policy, or to make a privacy request, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <div className="site-doc-section">
            <h2>Information we collect</h2>
            <ul>
              <li><strong>Account details</strong> you give us when you register: your name, email address, the role you request and, for students, your grade.</li>
              <li><strong>Learning activity</strong>: lessons and activities completed, quiz attempts and scores, XP, gems, streaks and badges.</li>
              <li><strong>Google sign-in</strong>: if you choose it, we receive your name and email address from Google.</li>
              <li><strong>A session cookie</strong> that keeps you signed in. It is not used for advertising.</li>
            </ul>
          </div>

          <div className="site-doc-section">
            <h2>How we use it</h2>
            <ul>
              <li>To run your account and deliver lessons, quizzes and rewards for your grade.</li>
              <li>To show progress to the student and to the teachers, school or parents connected to them.</li>
              <li>To show leaderboards, which display a learner’s name, grade, XP and streak.</li>
              <li>To send account emails, such as verification and password-reset links.</li>
            </ul>
          </div>

          <div className="site-doc-section">
            <h2>How it is protected</h2>
            <ul>
              <li>Passwords are stored hashed, never in plain text.</li>
              <li>Sessions use HTTP-only cookies that page scripts cannot read.</li>
              <li>Each account can only reach the parts of Intellia360 its role allows.</li>
              <li>Password-reset links can be used once and expire after one hour.</li>
            </ul>
          </div>

          <div className="site-doc-section">
            <h2>Your choices</h2>
            <p>
              Students can update their profile from the Profile page. To access, correct or
              delete your information, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
              from the address on your account.
            </p>
          </div>

          <div className="site-doc-section">
            <h2>Questions</h2>
            <p>
              See <Link href="/support">Help &amp; Support</Link>, read our{" "}
              <Link href="/terms">Terms of Service</Link>, or write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
