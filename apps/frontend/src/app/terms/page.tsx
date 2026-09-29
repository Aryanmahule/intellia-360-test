import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "@/styles/site-pages.css";

export const metadata: Metadata = {
  title: "Terms of Service | Intellia360",
  description: "A plain-language summary of the terms for using Intellia360.",
};

const CONTACT_EMAIL = "contact@intellia360.com";

// A plain-language summary. The complete, legally reviewed Terms of Service
// are still to be supplied by the business.
export default function TermsPage() {
  return (
    <main className="site-page">
      <SiteHeader />

      <section className="site-doc-hero" aria-labelledby="terms-title">
        <div className="site-container">
          <span className="site-eyebrow">📄 TERMS</span>
          <h1 id="terms-title">Terms of Service</h1>
          <p>The ground rules for using Intellia360, in plain language.</p>
          <p className="site-doc-meta">Last updated: 10 September 2026</p>
        </div>
      </section>

      <section className="site-doc">
        <div className="site-container site-doc-body">
          <p className="site-doc-note">
            This is a plain-language summary of the terms that apply to Intellia360. For the
            complete Terms of Service, or any question about them, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <div className="site-doc-section">
            <h2>Using Intellia360</h2>
            <p>
              Intellia360 is a learning platform for students, parents, teachers, schools and
              administrators. By creating an account or using the platform, you agree to use it
              for learning and teaching and to follow these terms.
            </p>
          </div>

          <div className="site-doc-section">
            <h2>Your account</h2>
            <ul>
              <li>Keep your password private and don’t share your account.</li>
              <li>New accounts start as student accounts. Teacher, school, parent and editor access is granted after an administrator reviews the request.</li>
              <li>Younger learners should use Intellia360 with the involvement of a parent, guardian or their school.</li>
            </ul>
          </div>

          <div className="site-doc-section">
            <h2>Acceptable use</h2>
            <ul>
              <li>Don’t try to access another person’s account or information.</li>
              <li>Don’t attempt to disrupt, overload or bypass the security of the platform.</li>
              <li>Don’t copy or redistribute lessons, stories, videos or other materials without permission.</li>
            </ul>
          </div>

          <div className="site-doc-section">
            <h2>Learning content</h2>
            <p>
              Lessons, ThinkTales stories, videos, illustrations and other materials on
              Intellia360 are provided for personal learning and classroom use.
            </p>
          </div>

          <div className="site-doc-section">
            <h2>Changes</h2>
            <p>
              We keep improving Intellia360, so features may change. When these terms change in
              a way that matters, this page will be updated.
            </p>
          </div>

          <div className="site-doc-section">
            <h2>Contact</h2>
            <p>
              Read our <Link href="/privacy">Privacy Policy</Link>, visit{" "}
              <Link href="/support">Help &amp; Support</Link>, or write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
