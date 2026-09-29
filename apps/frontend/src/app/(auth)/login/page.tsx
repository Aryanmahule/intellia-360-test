"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { postLoginPath } from "@intellia360/shared/auth/roles";
import type { AuthUser } from "@intellia360/shared/types/auth";
import { apiFetch } from "@/lib/api";

import "./login.css";

/* =========================================================
   DAILY WISDOM & MOTIVATION QUOTES (EASTER EGG)
   ========================================================= */

const DAILY_WISDOM: string[] = [
  "Tip: A bug you fix today is a feature tomorrow! 🧠",
  "Fun fact: The first computer bug was an actual moth! 🦋",
  "You're only 1 lesson away from Level 4 Mastery! ⚡",
  "Secret: 20 minutes of daily practice beats 5 hours on Sunday! 💡",
  "Pro tip: Read errors from bottom to top — save hours of debugging! 🔍",
  "Power-up: Curiosity is the greatest superpower in tech! 🚀",
  "Consistency is key: Code something small every single day! 🌟",
];

/* =========================================================
   ICONS
   ========================================================= */

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="social-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="social-icon" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      className="social-icon apple-icon"
      viewBox="0 0 814 1000"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 426.8 0 290.9 0 165.1 0 75.3 50.7 11 150.7 11c72.5 0 120.7 47.8 163.3 47.8 40.5 0 103.5-51 185.5-51 28.3 0 130 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

/* =========================================================
   GOOGLE TYPES
   ========================================================= */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (r: { credential: string }) => void;
          }): void;

          renderButton(el: HTMLElement, opts: object): void;

          prompt(): void;
        };
      };
    };
  }
}

/* =========================================================
   NEXT PARAM HELPER
   ========================================================= */

function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

/* =========================================================
   LOGIN PAGE COMPONENT
   ========================================================= */

export default function LoginPage() {
  const { login, completeLogin, status, user } = useAuth();
  const router = useRouter();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);

  const [activeField, setActiveField] = useState<"email" | "password" | null>(
    null
  );

  // 3D Mascot Cursor Tracking Coordinates
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  // Easter Egg States: Joyful Jump, Custom Wisdom & Floating Score
  const [mascotJump, setMascotJump] = useState(false);
  const [easterEggMessage, setEasterEggMessage] = useState<string | null>(null);
  const [floatingScoreId, setFloatingScoreId] = useState<number | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const signingInHere = useRef(false);
  const easterEggTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* =========================================================
     MASCOT CURSOR TRACKING
     ========================================================= */

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (window.innerWidth < 960) return;

      const { innerWidth, innerHeight } = window;
      const offsetX = (e.clientX / innerWidth - 0.5) * 12;
      const offsetY = (e.clientY / innerHeight - 0.5) * -12;

      setTilt({
        rotateX: Math.max(-8, Math.min(8, offsetY)),
        rotateY: Math.max(-10, Math.min(10, offsetX)),
      });
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* =========================================================
     AUTH REDIRECT
     ========================================================= */

  useEffect(() => {
    if (status !== "authenticated" || !user || signingInHere.current) {
      return;
    }

    router.replace(postLoginPath(user.role, readNextParam()));
  }, [status, user, router]);

  /* =========================================================
     GOOGLE LOGIN
     ========================================================= */

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

<<<<<<< HEAD:apps/frontend/src/app/(auth)/login/page.tsx
  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    signingInHere.current = true;
    try {
      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Same path as a password sign-in: the session is recorded in
        // AuthContext (so the console shows the real account, not a
        // placeholder) and the role lands on its own dashboard.
        completeLogin(json.data as AuthUser, readNextParam());
      } else {
=======
  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setGoogleLoading(true);
      setError("");

      signingInHere.current = true;

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        });

        const json = await res.json();

        if (json.success && json.data) {
          completeLogin(json.data as AuthUser, readNextParam());
        } else {
          signingInHere.current = false;
          setError(json.message ?? "Google sign-in failed.");
        }
      } catch {
>>>>>>> 724391acf66bb382eaa3e5436343993626871d26:src/app/(auth)/login/page.tsx
        signingInHere.current = false;
        setError("Google sign-in failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [completeLogin]
  );

  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = "google-gsi";

    if (document.getElementById(scriptId)) {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            width: 260,
          });
        }
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;

    script.onload = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 260,
        });
      }
    };

    document.body.appendChild(script);
  }, [googleClientId, handleGoogleCredential]);

  /* =========================================================
     LOGIN SUBMISSION
     ========================================================= */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setUnverified(false);
    setLoading(true);
    setActiveField(null);

    signingInHere.current = true;

    try {
      const result = await login(
        {
          emailOrUsername,
          password,
          rememberMe,
        },
        {
          next: readNextParam(),
        }
      );

      if (!result.success) {
        signingInHere.current = false;

        if (result.unverified) {
          setUnverified(true);
        }

        setError(result.message);
      }
    } catch {
      signingInHere.current = false;
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     EASTER EGG HANDLER: CLICK FOR WISDOM & HIGH-JUMP
     ========================================================= */

  const handleMascotEasterEgg = () => {
    // Trigger joyful high jump & spin
    setMascotJump(true);
    setTimeout(() => setMascotJump(false), 850);

    // Pick a random wisdom quote that is different from current
    const availableQuotes = DAILY_WISDOM.filter((q) => q !== easterEggMessage);
    const randomQuote =
      availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
    setEasterEggMessage(randomQuote);

    // Spawn floating score point
    const newId = Date.now();
    setFloatingScoreId(newId);
    setTimeout(() => setFloatingScoreId(null), 1400);

    // Reset speech bubble after 5.5 seconds back to normal state
    if (easterEggTimerRef.current) clearTimeout(easterEggTimerRef.current);
    easterEggTimerRef.current = setTimeout(() => {
      setEasterEggMessage(null);
    }, 5500);
  };

  /* =========================================================
     MASCOT ACTIVITY STATE & SPEECH
     ========================================================= */

  const getMascotActivity = () => {
    if (loading) {
      return {
        activityClass: "activity-launching",
        speech: "Powering up your learning space! 🚀",
        icon: "✨",
      };
    }
    if (error) {
      return {
        activityClass: "activity-error-shake",
        speech: "Oops! Let's double-check those details 🤔",
        icon: "💡",
      };
    }
    if (easterEggMessage) {
      return {
        activityClass: "activity-wisdom",
        speech: easterEggMessage,
        icon: "💎",
      };
    }
    if (activeField === "password") {
      if (showPassword) {
        return {
          activityClass: "activity-peeking",
          speech: "Checking password visibility! 👀",
          icon: "🔍",
        };
      }
      return {
        activityClass: "activity-hiding-password",
        speech: "No peeking! Your credentials are safe 🙈",
        icon: "🔒",
      };
    }
    if (activeField === "email") {
      return {
        activityClass: "activity-focus-email",
        speech: "Looking up your learning records... 📝",
        icon: "🎯",
      };
    }
    return {
      activityClass: "activity-idle",
      speech: "Welcome back! Ready to learn today? 👋",
      icon: "🌟",
    };
  };

  const mascotActivity = getMascotActivity();

  return (
    <div className="auth-shell">
      <main className="auth-showcase-container">
        {/* =================================================
            LEFT: WHITE SHOWCASE WITH INTERACTIVE MASCOT
            ================================================= */}
        <section className="showcase-visual-col" aria-label="Course Showcase">
          {/* Top Live Milestone Pill */}
          <div className="showcase-live-pill">
            <span className="live-pulse-dot" />
            <span>3,800+ Students Learning Right Now</span>
          </div>

          {/* Central 3D Mascot Stage */}
          <div className="showcase-stage">


            {/* MASCOT ARTWORK WITH CLICKABLE EASTER EGG */}
            <div
              className={`showcase-artwork-wrap ${mascotActivity.activityClass} ${mascotJump ? "mascot-joyful-jump" : ""
                }`}
              style={{
                transform: `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              }}
              onClick={handleMascotEasterEgg}
              title="Click me for Daily Wisdom!"
            >
              {/* Dynamic Interactive Speech Bubble */}
              <div className="mascot-speech-bubble" key={mascotActivity.speech}>
                <span className="speech-icon">{mascotActivity.icon}</span>
                <span className="speech-text">{mascotActivity.speech}</span>
                <div className="speech-arrow" />
              </div>

              {/* Floating +10 Motivation Reward Point */}
              {floatingScoreId && (
                <div className="floating-motivation-badge" key={floatingScoreId}>
                  +10 Motivation ✨
                </div>
              )}

              {/* Click Me For Daily Wisdom Badge */}
              <button
                type="button"
                className="mascot-easter-egg-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMascotEasterEgg();
                }}
              >
                <span>✨ Click me for Daily Wisdom</span>
              </button>

              {/* Standalone Mascot Image */}
              <img
                src="/assets/images/intellia360-mascot.png"
                alt="Intellia360 Learning Mascot"
                className="showcase-mascot-img"
                loading="eager"
              />

              {/* Ground Shadow */}
              <div className="showcase-artwork-shadow" />
            </div>


          </div>

          {/* Showcase Quote Footer */}
          <div className="showcase-footer-quote">
            <p className="quote-text">
              "Transforming curiosity into technical excellence every day."
            </p>
            <span className="quote-author">— Intellia360 Academic Council</span>
          </div>
        </section>

        {/* =================================================
            RIGHT: PROFESSIONAL LOGIN CARD
            ================================================= */}
        <section className="auth-card-col">
          <div className="auth-card">


            {/* HEADINGS */}
            <div className="auth-header">
              <h1 className="auth-card-title">Welcome Back!</h1>
              <p className="auth-card-subtitle">
                Sign in to continue your learning journey.
              </p>
            </div>

            {/* FORM */}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* ERROR BANNER */}
              {error && !unverified && (
                <div className="auth-error-banner" role="alert">
                  <span className="error-symbol">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* UNVERIFIED EMAIL ALERT */}
              {unverified && (
                <div className="auth-unverified" role="alert">
                  <div className="auth-unverified-icon">!</div>
                  <div className="auth-unverified-content">
                    <strong>Email not verified</strong>
                    <p>
                      Please check your inbox and verify your email before logging in.
                    </p>
                    <Link
                      href={`/resend-verification?email=${encodeURIComponent(
                        emailOrUsername
                      )}`}
                    >
                      Resend verification email &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* EMAIL FIELD */}
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="login-email">
                  Email
                </label>
                <div
                  className={`auth-input-wrap ${activeField === "email" ? "is-active" : ""
                    }`}
                >
                  <span className="auth-input-icon">
                    <MailIcon />
                  </span>
                  <input
                    id="login-email"
                    type="text"
                    className="auth-input"
                    placeholder="Enter your email"
                    value={emailOrUsername}
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="login-password">
                  Password
                </label>
                <div
                  className={`auth-input-wrap ${activeField === "password" ? "is-active" : ""
                    }`}
                >
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="auth-input has-right-btn"
                    placeholder="Enter your password"
                    value={password}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {/* REMEMBER ME & FORGOT PASSWORD */}
              <div className="auth-options-row">
                <label className="auth-checkbox-wrap">
                  <input
                    type="checkbox"
                    id="login-remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-checkbox" />
                  <span>Remember me</span>
                </label>

                <Link href="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>

              {/* PRIMARY SIGN IN BUTTON */}
              <button
                type="submit"
                id="login-submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                {!loading && <ArrowIcon />}
                {loading && <span className="login-loader" />}
              </button>

              {/* DIVIDER */}
              <div className="auth-divider">
                <span>OR CONTINUE WITH</span>
              </div>

              {/* SOCIAL LOGIN (ALL 3 IN ONE ROW ON DESKTOP) */}
              <div className="auth-social-row">
                {googleClientId ? (
                  <div className="google-wrap">
                    <div ref={googleBtnRef} className="google-btn-slot" />
                    {googleLoading && (
                      <p className="social-status-text">Connecting Google...</p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="auth-social-btn"
                    disabled
                    title="Google sign-in is configuring"
                  >
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                )}

                <button type="button" className="auth-social-btn">
                  <MicrosoftIcon />
                  <span>Microsoft</span>
                </button>

                <button type="button" className="auth-social-btn">
                  <AppleIcon />
                  <span>Apple</span>
                </button>
              </div>

              {/* FOOTER SWITCH */}
              <p className="auth-footer-switch">
                Don't have an account?{" "}
                <Link href="/register" className="auth-create-link">
                  Create Account
                </Link>
              </p>
            </form>
          </div>

          {/* SECURITY BADGE */}
          <div className="auth-bottom-note">
            <span className="secure-pulse-dot" />
            <span>Secure learning environment</span>
          </div>
        </section>
      </main>
    </div>
  );
}