"use client";

/**
 * The public site header.
 *
 * Every public route mounts this one component — home, courses, ThinkTales,
 * IntelliaPlay, For Schools, the support and legal pages, the 404 page and the
 * auth pages — so the navigation is identical everywhere and there is one
 * place to change it. The desktop bar keeps the original home-page markup and
 * class names, so home.css still styles it; site-chrome.css (loaded after it)
 * adds what the bar was missing: one visual weight for every item, the
 * current-page state, the search and cart popovers, and the mobile menu.
 *
 * The wrapper carries `home-page` purely as a scope hook: nearly every header
 * rule in home.css is written as `.home-page .header-…`. `.site-chrome` then
 * neutralises the page-level parts of that class (the 100vh min-height and the
 * page background) so the header stays a header wherever it is used.
 */

// The chrome ships its own styles, so any route can mount it without
// having to remember to import home.css.
import "@/app/home.css";
import "@/styles/site-chrome.css";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { dashboardFor } from "@intellia360/shared/auth/roles";

type DropdownKey = "math" | "schools";
type PanelKey = DropdownKey | "search" | "cart" | "mobile";

interface NavItem {
  label: string;
  href: string;
  keywords?: string;
}

/* ── Destinations ─────────────────────────────────────────────────────────── */

// Grade links open the courses carousel on that grade (courses/page.tsx reads ?grade=).
const gradeLink = (label: string): NavItem => ({
  label,
  href: `/courses?grade=${label.toLowerCase().replace(/\s+/g, "")}#all-courses`,
});

const LIVE_GRADES = ["LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"].map(gradeLink);

const UPCOMING_GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map(gradeLink);

const SCHOOL_LINKS: NavItem[] = [
  { label: "Intellia 360 School Program", href: "/schools" },
  { label: "Book A Free Demo", href: "/schools#demo" },
  { label: "Partner With Us", href: "/schools#partner" },
  { label: "FAQs", href: "/schools#faqs" },
];

const SEARCH_INDEX: NavItem[] = [
  { label: "Home", href: "/", keywords: "intellia360 main start" },
  { label: "All Courses", href: "/courses", keywords: "math program mathematics grades curriculum" },
  ...[...LIVE_GRADES, ...UPCOMING_GRADES].map((grade) => ({
    ...grade,
    label: `${grade.label} Mathematics`,
    keywords: "course grade class math",
  })),
  { label: "ThinkTales — story-based math", href: "/thinktales", keywords: "stories tales adventures" },
  { label: "IntelliaPlay — math games & challenges", href: "/intelliaplay", keywords: "play games quiz challenges xp streaks badges" },
  { label: "Intellia360 For Schools", href: "/schools", keywords: "school program teachers classroom" },
  { label: "Book A Free Demo", href: "/schools#demo", keywords: "demo contact school" },
  { label: "Partner With Us", href: "/schools#partner", keywords: "partnership coaching centre" },
  { label: "School FAQs", href: "/schools#faqs", keywords: "questions faq" },
  { label: "Login", href: "/login", keywords: "sign in account" },
  { label: "Create an account", href: "/register", keywords: "sign up register join" },
  { label: "Forgot password", href: "/forgot-password", keywords: "reset password" },
  { label: "Help & Support", href: "/support", keywords: "help contact support" },
  { label: "Privacy Policy", href: "/privacy", keywords: "privacy data" },
  { label: "Terms of Service", href: "/terms", keywords: "terms legal" },
];

// What the search panel offers before anything is typed.
const SUGGESTED_HREFS = ["/courses", "/thinktales", "/intelliaplay", "/schools", "/schools#demo", "/support"];
const SUGGESTED = SEARCH_INDEX.filter((item) => SUGGESTED_HREFS.includes(item.href));

function isCurrentPath(pathname: string, href: string): boolean {
  const path = href.split(/[?#]/)[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, status } = useAuth();

  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // A panel remembers the page it was opened on, so following a link to
  // another page closes it without needing an effect.
  const [open, setOpen] = useState<{ key: PanelKey; path: string } | null>(null);
  const openPanel = open?.path === pathname ? open.key : null;

  const [mobileGroup, setMobileGroup] = useState<DropdownKey | null>(null);
  const [query, setQuery] = useState("");

  const togglePanel = (key: PanelKey) =>
    setOpen((prev) => (prev?.key === key && prev.path === pathname ? null : { key, path: pathname }));
  const closePanels = () => setOpen(null);

  // Signed-in visitors get their dashboard instead of a Login button that the
  // proxy would only redirect.
  const account = status === "authenticated" ? user : null;
  const accountHref = account ? dashboardFor(account.role) : "/login";

  const mathCurrent = isCurrentPath(pathname, "/courses");
  const schoolsCurrent = isCurrentPath(pathname, "/schools");

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTED;
    return SEARCH_INDEX.filter((item) =>
      `${item.label} ${item.keywords ?? ""}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  // A press outside the open panel, or Escape, closes it.
  useEffect(() => {
    if (!openPanel) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!headerRef.current?.contains(target)) {
        setOpen(null);
        return;
      }
      // Inside the header the mobile menu stays open (its backdrop closes it);
      // a dropdown or popover closes when the press lands outside its own panel.
      if (openPanel === "mobile") return;
      if (target.closest("[data-panel]")?.getAttribute("data-panel") !== openPanel) {
        setOpen(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPanel]);

  // While the mobile menu covers the page, lock the scroll behind it, and drop
  // the menu if the viewport grows back to the desktop bar.
  useEffect(() => {
    if (openPanel !== "mobile") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const desktop = window.matchMedia("(min-width: 1081px)");
    const onChange = () => {
      if (desktop.matches) setOpen(null);
    };
    desktop.addEventListener("change", onChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", onChange);
    };
  }, [openPanel]);

  useEffect(() => {
    if (openPanel === "search") searchInputRef.current?.focus();
  }, [openPanel]);

  const openSearchResult = (href: string) => {
    setQuery("");
    closePanels();
    router.push(href);
  };

  const navLinkClass = (href: string) =>
    `header-nav-link${isCurrentPath(pathname, href) ? " active" : ""}`;
  const mobileLinkClass = (href: string) =>
    `header-mobile-link${isCurrentPath(pathname, href) ? " active" : ""}`;
  const ariaCurrent = (href: string) => (isCurrentPath(pathname, href) ? ("page" as const) : undefined);

  return (
    <div className="site-chrome home-page">
      <header className="home-header" ref={headerRef}>

        {/* ==================================================
      MAIN HEADER
  ================================================== */}

        <div className="header-main">

          <div className="home-container header-inner">

            {/* LOGO */}

            <Link
              href="/"
              className="home-logo"
              aria-label="Intellia360 Home"
              onClick={closePanels}
            >
              <Image
                src="/assets/logo/intellia360-log.png"
                alt="Intellia360"
                width={220}
                height={120}
                priority
                className="home-logo-image"
              />
            </Link>

            {/* ==================================================
          NAVIGATION
      ================================================== */}

            <nav className="desktop-nav" aria-label="Main">

              {/* HOME */}

              <Link href="/" className={navLinkClass("/")} aria-current={ariaCurrent("/")}>
                Home
              </Link>

              {/* ==================================================
            MATH PROGRAM DROPDOWN
        ================================================== */}

              <div
                className={`header-mega-dropdown ${openPanel === "math" ? "dropdown-open" : ""}`}
                data-panel="math"
              >
                <button
                  type="button"
                  className={`header-dropdown-trigger${openPanel === "math" ? " dropdown-trigger-active" : ""}${mathCurrent ? " is-current" : ""}`}
                  aria-expanded={openPanel === "math"}
                  aria-controls="site-math-menu"
                  onClick={() => togglePanel("math")}
                >
                  Math Program
                  <span className="dropdown-arrow" aria-hidden="true">
                    {openPanel === "math" ? "⌃" : "⌄"}
                  </span>
                </button>

                <div
                  id="site-math-menu"
                  className={`header-mega-menu math-menu ${openPanel === "math" ? "mega-menu-open" : ""}`}
                >

                  {/* MATH GRADES */}

                  <div className="mega-column">
                    <h4>MATH GRADES</h4>
                    <div className="mega-divider" />

                    {LIVE_GRADES.map((grade) => (
                      <Link key={grade.href} href={grade.href} onClick={closePanels}>
                        {grade.label}
                      </Link>
                    ))}

                    {account ? (
                      // A full page load into the module — see leaveFor() in AuthContext.
                      <a href={accountHref} className="mega-dashboard-btn">
                        MY DASHBOARD
                      </a>
                    ) : (
                      <Link href="/login" className="mega-dashboard-btn" onClick={closePanels}>
                        STUDENT DASHBOARD
                      </Link>
                    )}
                  </div>

                  <div className="mega-column">
                    <h4>COMING SHORTLY</h4>
                    <div className="mega-divider" />

                    {UPCOMING_GRADES.map((grade) => (
                      <Link key={grade.href} href={grade.href} onClick={closePanels}>
                        {grade.label}
                      </Link>
                    ))}
                  </div>

                  {/* PROGRAM DESCRIPTION */}

                  <div className="mega-column mega-description">
                    <h4>MATH PROGRAM</h4>

                    <p>
                      The Intellia360 Mathematics Program is a
                      comprehensive, gamified learning solution
                      designed to help students develop strong
                      mathematical concepts, logical thinking,
                      and real-world problem-solving skills.
                      Aligned with leading national and
                      international curricula, the program
                      transforms traditional mathematics education
                      into an engaging and interactive learning
                      experience.
                    </p>

                    <Link href="/courses" className="mega-all-courses" onClick={closePanels}>
                      Explore all courses →
                    </Link>

                    <div className="mega-description-line" />
                  </div>

                  {/* IMAGE */}

                  <div className="mega-image-wrap">
                    <Image
                      src="/assets/home/math-program-menu.png"
                      alt="Intellia360 Math Program"
                      width={580}
                      height={330}
                      className="mega-image"
                    />
                  </div>

                  {/* BOTTOM TITLE */}

                  <div className="mega-bottom-title">
                    <span>
                      Play. Learn. Evolve
                    </span>

                    <div className="mega-title-decoration">
                      <i />
                      <i />
                      <i />
                      <b />
                    </div>
                  </div>

                </div>
              </div>

              {/* THINK TALES */}

              <Link href="/thinktales" className={navLinkClass("/thinktales")} aria-current={ariaCurrent("/thinktales")}>
                ThinkTales
              </Link>

              {/* INTELLIAPLAY */}

              <Link href="/intelliaplay" className={navLinkClass("/intelliaplay")} aria-current={ariaCurrent("/intelliaplay")}>
                IntelliaPlay
              </Link>

              {/* ==================================================
            SCHOOLS DROPDOWN
        ================================================== */}

              <div
                className={`header-mega-dropdown ${openPanel === "schools" ? "dropdown-open" : ""}`}
                data-panel="schools"
              >
                <button
                  type="button"
                  className={`header-dropdown-trigger${openPanel === "schools" ? " dropdown-trigger-active" : ""}${schoolsCurrent ? " is-current" : ""}`}
                  aria-expanded={openPanel === "schools"}
                  aria-controls="site-schools-menu"
                  onClick={() => togglePanel("schools")}
                >
                  Intellia360 For Schools
                  <span className="dropdown-arrow" aria-hidden="true">
                    {openPanel === "schools" ? "⌃" : "⌄"}
                  </span>
                </button>

                <div
                  id="site-schools-menu"
                  className={`header-mega-menu school-menu ${openPanel === "schools" ? "mega-menu-open" : ""}`}
                >

                  {/* ABOUT */}

                  <div className="school-menu-left">
                    <h4>ABOUT</h4>

                    {SCHOOL_LINKS.map((item) => (
                      <Link key={item.href} href={item.href} onClick={closePanels}>
                        {item.label}
                      </Link>
                    ))}

                    <Link
                      href="/schools#demo"
                      className="school-start-btn"
                      onClick={closePanels}
                    >
                      GET STARTED TODAY
                    </Link>
                  </div>

                  {/* ABOUT PROGRAM */}

                  <div className="school-menu-description">
                    <h4>ABOUT PROGRAM</h4>

                    <p>
                      More than a digital learning platform,
                      Intellia360 is a complete mathematics
                      ecosystem designed to improve conceptual
                      understanding, strengthen logical reasoning,
                      and develop critical thinking skills.
                    </p>

                    <p>
                      Built for modern classrooms, it empowers
                      every learner through personalized
                      experiences while giving educators powerful
                      tools to monitor progress and drive success.
                    </p>
                  </div>

                  {/* SCHOOL IMAGE */}

                  <div className="school-menu-image-wrap">
                    <Image
                      src="/assets/home/school.png"
                      alt="Intellia360 School Program"
                      width={650}
                      height={360}
                      className="school-menu-image"
                    />
                  </div>

                  {/* BOTTOM TITLE */}

                  <div className="school-bottom-title">
                    Let&apos;s Build Future-Ready Learners Together. 🚀

                    <div className="mega-title-decoration">
                      <i />
                      <i />
                      <i />
                      <b />
                    </div>
                  </div>

                </div>
              </div>

            </nav>

            {/* ==================================================
          HEADER ACTIONS
      ================================================== */}

            <div className="header-actions">

              {/* SEARCH */}

              <div className="header-popover-anchor" data-panel="search">
                <button
                  type="button"
                  className="header-icon-btn"
                  aria-label="Search the site"
                  aria-expanded={openPanel === "search"}
                  aria-controls="site-search-panel"
                  onClick={() => togglePanel("search")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5L21 21" />
                  </svg>
                </button>

                {openPanel === "search" && (
                  <div
                    id="site-search-panel"
                    className="header-popover header-search-panel"
                    role="dialog"
                    aria-label="Search Intellia360"
                  >
                    <input
                      ref={searchInputRef}
                      type="search"
                      className="header-search-input"
                      placeholder="Search courses, ThinkTales, schools…"
                      aria-label="Search the site"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && searchResults[0]) {
                          event.preventDefault();
                          openSearchResult(searchResults[0].href);
                        }
                      }}
                    />

                    {!query.trim() && <p className="header-popover-label">Popular pages</p>}

                    {searchResults.length === 0 ? (
                      <p className="header-popover-text">
                        No pages match &ldquo;{query.trim()}&rdquo;.
                      </p>
                    ) : (
                      <ul className="header-search-results">
                        {searchResults.map((item) => (
                          <li key={`${item.href}|${item.label}`}>
                            <Link
                              href={item.href}
                              className="header-search-result"
                              onClick={() => {
                                setQuery("");
                                closePanels();
                              }}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* CART */}

              <div className="header-popover-anchor header-cart-anchor" data-panel="cart">
                <button
                  type="button"
                  className="header-cart-btn"
                  aria-label="Cart, 0 items"
                  aria-expanded={openPanel === "cart"}
                  aria-controls="site-cart-panel"
                  onClick={() => togglePanel("cart")}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                    <circle cx="10" cy="20" r="1.2" />
                    <circle cx="18" cy="20" r="1.2" />
                  </svg>

                  <span className="cart-count" aria-hidden="true">
                    0
                  </span>
                </button>

                {openPanel === "cart" && (
                  <div
                    id="site-cart-panel"
                    className="header-popover header-cart-panel"
                    role="dialog"
                    aria-label="Cart"
                  >
                    <p className="header-popover-title">Your cart is empty</p>
                    <p className="header-popover-text">
                      Choose a grade to explore the Intellia360 Mathematics program.
                    </p>
                    <Link href="/courses" className="header-popover-cta" onClick={closePanels}>
                      Browse courses →
                    </Link>
                  </div>
                )}
              </div>

              {/* LOGIN / DASHBOARD */}

              {account ? (
                // A full page load into the module — see leaveFor() in AuthContext.
                <a href={accountHref} className="header-login-btn">
                  Dashboard
                </a>
              ) : (
                <Link href="/login" className="header-login-btn" onClick={closePanels}>
                  Login
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}

              <button
                type="button"
                className={`header-menu-toggle${openPanel === "mobile" ? " is-open" : ""}`}
                aria-label={openPanel === "mobile" ? "Close menu" : "Open menu"}
                aria-expanded={openPanel === "mobile"}
                aria-controls="site-mobile-menu"
                data-panel="mobile"
                onClick={() => togglePanel("mobile")}
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>

            </div>

          </div>

        </div>

        {/* ==================================================
      MOBILE MENU (below the desktop breakpoint)
  ================================================== */}

        {openPanel === "mobile" && (
          <div className="header-mobile-backdrop" aria-hidden="true" onClick={closePanels} />
        )}

        <div
          id="site-mobile-menu"
          className="header-mobile-panel"
          data-panel="mobile"
          hidden={openPanel !== "mobile"}
        >
          <nav className="header-mobile-nav" aria-label="Main">
            <Link href="/" className={mobileLinkClass("/")} aria-current={ariaCurrent("/")} onClick={closePanels}>
              Home
            </Link>

            <MobileGroup
              label="Math Program"
              open={mobileGroup === "math"}
              current={mathCurrent}
              onToggle={() => setMobileGroup((group) => (group === "math" ? null : "math"))}
            >
              <Link href="/courses" className="header-mobile-sublink is-wide" onClick={closePanels}>
                All courses →
              </Link>
              <span className="header-mobile-sublabel">MATH GRADES</span>
              {LIVE_GRADES.map((grade) => (
                <Link key={grade.href} href={grade.href} className="header-mobile-sublink" onClick={closePanels}>
                  {grade.label}
                </Link>
              ))}
              <span className="header-mobile-sublabel">COMING SHORTLY</span>
              {UPCOMING_GRADES.map((grade) => (
                <Link key={grade.href} href={grade.href} className="header-mobile-sublink" onClick={closePanels}>
                  {grade.label}
                </Link>
              ))}
            </MobileGroup>

            <Link href="/thinktales" className={mobileLinkClass("/thinktales")} aria-current={ariaCurrent("/thinktales")} onClick={closePanels}>
              ThinkTales
            </Link>

            <Link href="/intelliaplay" className={mobileLinkClass("/intelliaplay")} aria-current={ariaCurrent("/intelliaplay")} onClick={closePanels}>
              IntelliaPlay
            </Link>

            <MobileGroup
              label="Intellia360 For Schools"
              open={mobileGroup === "schools"}
              current={schoolsCurrent}
              onToggle={() => setMobileGroup((group) => (group === "schools" ? null : "schools"))}
            >
              {SCHOOL_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="header-mobile-sublink is-wide" onClick={closePanels}>
                  {item.label}
                </Link>
              ))}
            </MobileGroup>
          </nav>

          <div className="header-mobile-cta">
            {account ? (
              // A full page load into the module — see leaveFor() in AuthContext.
              <a href={accountHref} className="is-primary">
                Go to my dashboard
              </a>
            ) : (
              <>
                <Link href="/login" className="is-secondary" onClick={closePanels}>
                  Login
                </Link>
                <Link href="/register" className="is-primary" onClick={closePanels}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>

      </header>
    </div>
  );
}

function MobileGroup({
  label,
  open,
  current,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  current: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`header-mobile-group${open ? " is-open" : ""}`}>
      <button
        type="button"
        className={`header-mobile-link${current ? " active" : ""}`}
        aria-expanded={open}
        onClick={onToggle}
      >
        {label}
        <span className="header-mobile-chevron" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && <div className="header-mobile-sublist">{children}</div>}
    </div>
  );
}
