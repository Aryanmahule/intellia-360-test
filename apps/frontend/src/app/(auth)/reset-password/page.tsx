"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = await res.json();
      if (json.success) { setDone(true); }
      else { setError(json.message); }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-error-banner">
        ⚠️ Invalid or missing reset token. Please request a new password reset link.
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
        <div className="auth-success-banner">
          ✅ Your password has been reset successfully!
        </div>
        <Link href="/login" className="auth-submit-btn" style={{ textDecoration: "none", justifyContent: "center" }}>
          Log In Now <ArrowIcon />
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate style={{ marginTop: "8px" }}>
      {error && <div className="auth-error-banner" role="alert">⚠️ {error}</div>}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="reset-password">New Password</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><LockIcon /></span>
          <input id="reset-password" type={showPassword ? "text" : "password"}
            className="auth-input has-right-icon" placeholder="Create a new password"
            value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <button type="button" className="auth-input-right-btn"
            onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="reset-confirm">Confirm New Password</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><LockIcon /></span>
          <input id="reset-confirm" type={showConfirm ? "text" : "password"}
            className="auth-input has-right-icon" placeholder="Confirm your new password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          <button type="button" className="auth-input-right-btn"
            onClick={() => setShowConfirm((s) => !s)} aria-label="Toggle password visibility">
            <EyeIcon open={showConfirm} />
          </button>
        </div>
      </div>
      <button type="submit" id="reset-submit" className="auth-submit-btn" disabled={loading}>
        {loading ? "Resetting…" : "Reset Password"}
        {!loading && <ArrowIcon />}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    // Header and footer come from (auth)/layout.tsx.
    <div className="auth-shell">
      <div className="auth-body" style={{ gridTemplateColumns: "1fr", maxWidth: "480px" }}>
        <div className="auth-card">
          <h1 className="auth-card-title">Reset Your Password</h1>
          <p className="auth-card-tagline">Enter and confirm your new password below.</p>
          <Suspense fallback={<div className="auth-loading-spinner" style={{ margin: "24px auto" }} />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
