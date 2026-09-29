"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@intellia360/shared/types/auth";
import { REGISTRABLE_ROLES, type RegistrableRole } from "@intellia360/shared/auth/roles";

import "./signup.css";

type IntentPresentation = {
  label: string;
  sub: string;
};

// Parent registration is intentionally not offered in the signup UI.
// Keep the presentation map partial so the UI only needs to define visible roles.
const INTENT_PRESENTATION: Partial<Record<RegistrableRole, IntentPresentation>> = {
  STUDENT: { label: "Student", sub: "I want to learn" },
  TEACHER: { label: "Teacher", sub: "I want to teach" },
  SCHOOL: { label: "School", sub: "I manage a school" },
  EDITOR: { label: "Editor", sub: "I want to create content" },
};

const INTENT_ORDER: RegistrableRole[] = [
  "STUDENT",
  "TEACHER",
  "SCHOOL",
  "EDITOR",
];

const INTENT_OPTIONS = INTENT_ORDER
  .filter((role) => REGISTRABLE_ROLES.includes(role))
  .map((value) => ({
    value,
    ...INTENT_PRESENTATION[value]!,
  }));

const PASSWORD_RULES: { test: (value: string) => boolean; message: string }[] = [
  {
    test: (value) => value.length >= 8,
    message: "Password must be at least 8 characters",
  },
  {
    test: (value) => /[A-Za-z]/.test(value),
    message: "Password must contain at least one letter",
  },
  {
    test: (value) => /[0-9]/.test(value),
    message: "Password must contain at least one number",
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    message: "Password must contain at least one special character",
  },
];

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );
}

function RoleIcon({ role }: { role: RegistrableRole }) {
  if (role === "STUDENT") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11.2v5.1c2.9 2.2 7.1 2.2 10 0v-5.1" />
        <path d="M21 9v6" />
      </svg>
    );
  }

  if (role === "TEACHER") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="7" r="3.2" />
        <path d="M5.5 21v-1.3a6.5 6.5 0 0 1 13 0V21" />
        <path d="M17.8 9.2 20 11l-2.2 1.8" />
      </svg>
    );
  }

  if (role === "PARENT") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.3" />
        <path d="M3 20v-1.1a6 6 0 0 1 12 0V20" />
        <path d="M14.5 16.5a5 5 0 0 1 6 3.5" />
      </svg>
    );
  }

  if (role === "SCHOOL") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M7 21v-7h10v7M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14 5 5 5" />
      <path d="m4 20 3.5-.8L18.5 8.2a2.12 2.12 0 0 0-3-3L4.5 16.2 4 20Z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="auth-social-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="auth-social-icon" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="auth-social-icon auth-apple-icon" viewBox="0 0 814 1000" fill="#000" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 426.8 0 290.9 0 165.1 0 75.3 50.7 11 150.7 11c72.5 0 120.7 47.8 163.3 47.8 40.5 0 103.5-51 185.5-51 28.3 0 130 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Register page                                                              */
/* -------------------------------------------------------------------------- */

export default function RegisterPage() {
  const { register, completeLogin } = useAuth();

  const [requestedRole, setRequestedRole] = useState<RegistrableRole>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [emailSent, setEmailSent] = useState(true);
  const [verifyingUser, setVerifyingUser] = useState<AuthUser | null>(null);
  const [verifyStep, setVerifyStep] = useState(0);

  const fieldError = (field: string) => fieldErrors[field]?.[0];

  useEffect(() => {
    if (!verifyingUser) return;

    const timers = [
      window.setTimeout(() => setVerifyStep(1), 900),
      window.setTimeout(() => setVerifyStep(2), 1800),
      window.setTimeout(() => completeLogin(verifyingUser), 2600),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [verifyingUser, completeLogin]);

  function validate(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    if (name.trim().length < 2) {
      errors.name = ["Full name must be at least 2 characters"];
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = ["Enter a valid email address"];
    }

    const failed = PASSWORD_RULES
      .filter((rule) => !rule.test(password))
      .map((rule) => rule.message);

    if (failed.length) errors.password = failed;

    if (password !== confirmPassword) {
      errors.confirmPassword = ["Passwords do not match"];
    }

    if (!agreeToTerms) {
      errors.agreeToTerms = ["You must agree to the Terms of Service"];
    }

    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const clientErrors = validate();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please check the highlighted fields below.");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        requestedRole,
        agreeToTerms,
      });

      if (result.success && result.user) {
        setVerifyingUser(result.user);
      } else if (result.success) {
        setEmailSent(result.emailSent !== false);
        setRegisteredEmail(email.trim());
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        setFieldErrors(result.errors);
        setError("Please check the highlighted fields below.");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Instant verification state                                               */
  /* ------------------------------------------------------------------------ */

  if (verifyingUser) {
    const requested = verifyingUser.requestedRole;
    const pendingLabel =
      requested && requested !== verifyingUser.role
        ? INTENT_PRESENTATION[requested as RegistrableRole]?.label ?? null
        : null;

    const steps = [
      "Account created",
      "Email address verified",
      "Signing you in",
    ];

    const done = verifyStep >= 2;

    return (
      <div className="auth-shell register-auth-shell">
        <div className="register-status-page">
          <div className="register-status-card" role="status" aria-live="polite">
            <div className={`register-status-icon ${done ? "success" : "loading"}`} aria-hidden="true">
              {done ? (
                <CheckIcon />
              ) : (
                <span className="register-spinner" />
              )}
            </div>

            <p className="register-eyebrow">
              {done ? "ACCOUNT READY" : "SECURE SETUP"}
            </p>

            <h1>{done ? "You're verified!" : "Verifying your account…"}</h1>

            <p className="register-status-email">{verifyingUser.email}</p>

            <ol className="register-progress-list">
              {steps.map((label, index) => {
                const complete = index <= verifyStep;

                return (
                  <li key={label} className={complete ? "complete" : ""}>
                    <span>{complete ? <CheckIcon /> : index + 1}</span>
                    {label}
                  </li>
                );
              })}
            </ol>

            {pendingLabel && (
              <p className="register-pending-note">
                Your <strong>{pendingLabel}</strong> access is waiting for an administrator.
                You can start on the Student plan now and move over automatically once it is approved.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Email confirmation state                                                  */
  /* ------------------------------------------------------------------------ */

  if (registeredEmail) {
    return (
      <div className="auth-shell register-auth-shell">
        <div className="register-status-page">
          <div className="register-status-card">
            <div className={`register-status-icon ${emailSent ? "success" : "warning"}`} aria-hidden="true">
              {emailSent ? <MailIcon /> : <ShieldCheckIcon />}
            </div>

            <p className="register-eyebrow">
              {emailSent ? "ONE LAST STEP" : "ACCOUNT CREATED"}
            </p>

            <h1>{emailSent ? "Check your inbox" : "Account created"}</h1>

            <p className="register-status-copy">
              {emailSent
                ? "We've sent a verification link to"
                : "Your account was created, but we could not deliver the verification email to"}
            </p>

            <p className="register-status-email">{registeredEmail}</p>

            <p className="register-status-help">
              {emailSent ? (
                <>
                  Click the link in the email to activate your account.
                  The link expires after <strong>24 hours</strong>. Check your spam folder if you do not see it.
                </>
              ) : (
                <>
                  You must verify your email before you can log in. Use
                  <strong> Resend verification email </strong>
                  below.
                </>
              )}
            </p>

            <div className="register-status-actions">
              <Link className="register-primary-link" href="/resend-verification">
                Resend verification email
              </Link>

              <Link className="register-back-link" href="/login">
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Main registration screen                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="auth-shell register-auth-shell">
      <main className="register-form-page">
        <section className="register-layout">
          <section className="register-card" aria-labelledby="register-title">
            <div className="register-card-top">



            </div>

            <div className="register-card-header">
              <h1 id="register-title">Create your account</h1>
            </div>

            <div className="register-role-section">
              <div className="register-role-label">
                Choose your role
              </div>

              <div
                className="register-role-grid"
                role="group"
                aria-label="Select your intended use"
              >
                {INTENT_OPTIONS.map((role) => {
                  const active = requestedRole === role.value;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      className={`register-role-btn${active ? " active" : ""}`}
                      onClick={() => setRequestedRole(role.value)}
                      aria-pressed={active}
                    >
                      <span className="register-role-icon">
                        <RoleIcon role={role.value} />
                      </span>
                      <strong>{role.label}</strong>

                      {active && (
                        <span className="register-role-selected">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <form className="register-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="register-error-banner" role="alert">
                  <span>!</span>
                  {error}
                </div>
              )}

              <div className="register-form-row">
                <div className="register-field">
                  <label htmlFor="reg-name">Full Name</label>
                  <div className="register-input-wrap">
                    <span className="register-input-icon">
                      <PersonIcon />
                    </span>
                    <input
                      id="reg-name"
                      type="text"
                      className={`register-input${fieldError("name") ? " has-error" : ""}`}
                      placeholder="Enter your full name"
                      aria-invalid={!!fieldError("name")}
                      aria-describedby={fieldError("name") ? "reg-name-error" : undefined}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>

                  {fieldError("name") && (
                    <span className="register-field-error" id="reg-name-error">
                      {fieldError("name")}
                    </span>
                  )}
                </div>

                <div className="register-field">
                  <label htmlFor="reg-email">Email Address</label>
                  <div className="register-input-wrap">
                    <span className="register-input-icon">
                      <MailIcon />
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      className={`register-input${fieldError("email") ? " has-error" : ""}`}
                      placeholder="Enter your email"
                      aria-invalid={!!fieldError("email")}
                      aria-describedby={fieldError("email") ? "reg-email-error" : undefined}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  {fieldError("email") && (
                    <span className="register-field-error" id="reg-email-error">
                      {fieldError("email")}
                    </span>
                  )}
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-field">
                  <label htmlFor="reg-password">Password</label>
                  <div className="register-input-wrap">
                    <span className="register-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      className={`register-input has-right-icon${fieldError("password") ? " has-error" : ""}`}
                      placeholder="Create a strong password"
                      aria-invalid={!!fieldError("password")}
                      aria-describedby={fieldErrors.password ? "reg-password-error" : "reg-password-hint"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="register-input-right-btn"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>

                  {fieldErrors.password ? (
                    <span className="register-field-error" id="reg-password-error">
                      {fieldErrors.password.map((message) => (
                        <span key={message}>{message}</span>
                      ))}
                    </span>
                  ) : null}
                </div>

                <div className="register-field">
                  <label htmlFor="reg-confirm">Confirm Password</label>
                  <div className="register-input-wrap">
                    <span className="register-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      className={`register-input has-right-icon${fieldError("confirmPassword") ? " has-error" : ""}`}
                      placeholder="Confirm your password"
                      aria-invalid={!!fieldError("confirmPassword")}
                      aria-describedby={fieldError("confirmPassword") ? "reg-confirm-error" : undefined}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="register-input-right-btn"
                      onClick={() => setShowConfirm((value) => !value)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>

                  {fieldError("confirmPassword") && (
                    <span className="register-field-error" id="reg-confirm-error">
                      {fieldError("confirmPassword")}
                    </span>
                  )}
                </div>
              </div>

              <div className="register-terms-row">
                <label className="register-checkbox">
                  <input
                    type="checkbox"
                    id="reg-terms"
                    checked={agreeToTerms}
                    onChange={(event) => setAgreeToTerms(event.target.checked)}
                  />
                  <span className="register-custom-checkbox">
                    <CheckIcon />
                  </span>
                  <span>
                    I agree to the{" "}
                    <Link href="/terms">Terms of Service</Link>{" "}
                    and <Link href="/privacy">Privacy Policy</Link>
                  </span>
                </label>

                {fieldError("agreeToTerms") && (
                  <span className="register-field-error">
                    {fieldError("agreeToTerms")}
                  </span>
                )}
              </div>

              <button
                type="submit"
                id="register-submit"
                className="register-submit"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
                {!loading && <ArrowIcon />}
              </button>

              <div className="register-divider">
                <span>OR</span>
              </div>

              <div className="register-social-row">
                <button type="button" className="register-social-btn" id="reg-google">
                  <GoogleIcon />
                  Google
                </button>
                <button type="button" className="register-social-btn" id="reg-microsoft">
                  <MicrosoftIcon />
                  Microsoft
                </button>
                <button type="button" className="register-social-btn" id="reg-apple">
                  <AppleIcon />
                  Apple
                </button>
              </div>

              <div className="register-bottom-login">
                Already have an account?{" "}
                <Link href="/login">Login</Link>
              </div>

            </form>
          </section>

          <aside className="register-mascot-side" aria-hidden="true">
            <div className="register-mascot-wrap">
              <img
                src="/assets/images/intellia360-mascot.png"
                alt=""
                className="register-mascot"
              />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}