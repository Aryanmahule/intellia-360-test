"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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

function ResendForm() {
  const searchParams = useSearchParams();
  const prefill      = searchParams.get("email") ?? "";

  const [email,   setEmail]   = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      setSent(true); // always show success (anti-enumeration)
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(16,185,129,.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",margin:"0 0 24px",border:"2px solid rgba(16,185,129,.25)" }}>
          📬
        </div>
        <h1 style={{ fontSize:"1.5rem",fontWeight:800,color:"#1e1b4b",margin:"0 0 10px" }}>Check your inbox</h1>
        <p style={{ fontSize:"0.92rem",color:"#4b5563",lineHeight:1.65,margin:"0 0 28px" }}>
          If <strong>{email}</strong> is registered and not yet verified, we&apos;ve sent a new
          verification link. Please check your inbox and spam folder.
          The link expires in <strong>24 hours</strong>.
        </p>
        <button type="button" className="auth-submit-btn" style={{ marginBottom:12 }}
          onClick={() => { setSent(false); setEmail(""); }}>
          Send to a different email
        </button>
        <div style={{ textAlign:"center" }}>
          <Link href="/login" style={{ fontSize:"0.88rem",color:"#f97316",fontWeight:600 }}>
            ← Back to login
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(249,115,22,.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",marginBottom:20,border:"2px solid rgba(249,115,22,.20)" }}>
        ✉️
      </div>
      <h1 style={{ fontSize:"1.5rem",fontWeight:800,color:"#1e1b4b",margin:"0 0 8px" }}>
        Resend verification email
      </h1>
      <p style={{ fontSize:"0.92rem",color:"#4b5563",margin:"0 0 28px",lineHeight:1.6 }}>
        Enter your email address and we&apos;ll send a fresh verification link.
        The link expires after 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && <div className="auth-error-banner" role="alert">⚠️ {error}</div>}
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="resend-email">Email Address</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon"><MailIcon /></span>
            <input
              id="resend-email" type="email" className="auth-input"
              placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>
        </div>
        <button type="submit" className="auth-submit-btn" disabled={loading || !email.trim()}>
          {loading ? "Sending…" : "Send Verification Email"} {!loading && <ArrowIcon />}
        </button>
        <p style={{ textAlign:"center",fontSize:"0.83rem",color:"#9ca3af",margin:"4px 0 0" }}>
          You can request a new link once every 60 seconds.
        </p>
      </form>
    </>
  );
}

export default function ResendVerificationPage() {
  return (
    // Header and footer come from (auth)/layout.tsx.
    <div className="auth-shell">
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 24px" }}>
        <div style={{ background:"#fff",borderRadius:24,padding:"44px",maxWidth:460,width:"100%",boxShadow:"0 8px 40px rgba(30,27,75,.10)" }}>
          <Suspense fallback={null}>
            <ResendForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
