import Link from "next/link";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";
import "@/styles/site-pages.css";

/**
 * The 404 page for every unmatched URL. It carries the shared site header and
 * footer, so a broken link never strands a visitor on a page with no way back.
 */
export default function NotFound() {
  return (
    <main className="site-page">
      <SiteHeader />

      <section className="site-notfound" aria-labelledby="notfound-title">
        <div className="site-container">
          <div className="site-notfound-code" aria-hidden="true">
            404
          </div>
          <h1 id="notfound-title">This page could not be found</h1>
          <p>The link may be broken, or the page may have moved. Try one of these instead.</p>

          <div className="site-hero-actions">
            <Link href="/" className="site-btn site-btn--primary">
              Back to Home
            </Link>
            <Link href="/courses" className="site-btn site-btn--ghost">
              Browse Courses
            </Link>
          </div>

          <nav className="site-notfound-links" aria-label="Popular pages">
            <Link href="/thinktales">ThinkTales</Link>
            <Link href="/intelliaplay">IntelliaPlay</Link>
            <Link href="/schools">For Schools</Link>
            <Link href="/login">Login</Link>
            <Link href="/support">Help &amp; Support</Link>
          </nav>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
