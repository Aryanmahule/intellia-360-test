"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardFor } from "@intellia360/shared/auth/roles";
import type { AuthUser, UserRole } from "@intellia360/shared/types/auth";
import { apiFetch } from "@/lib/api";

type Status = "verifying" | "success" | "expired" | "used" | "invalid" | "no-token";

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { completeLogin } = useAuth();

  const [status, setStatus]   = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  const verify = useCallback(async (token: string) => {
    if (calledRef.current) return;
    calledRef.current = true;

    try {
      const res  = await apiFetch("/api/auth/verify-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token }),
      });
      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setMessage(json.message);
        // Auto-redirect to dashboard after 2 s. Verifying signs the user in,
        // so the new session is handed to AuthContext (and on to the role's
        // own dashboard) instead of waiting for a page reload to discover it.
        setTimeout(() => {
          const verified = json.data as Partial<AuthUser> | undefined;
          if (verified?.id && verified.role) {
            completeLogin(verified as AuthUser);
          } else {
            const role: UserRole = verified?.role ?? "STUDENT";
            router.push(dashboardFor(role));
          }
        }, 2000);
        return;
      }

      // Distinguish error types from the errors hint
      const errHint = json.errors?.token?.[0] ?? "";
      if (errHint === "expired") {
        setStatus("expired");
      } else if (json.message?.toLowerCase().includes("already been used")) {
        setStatus("used");
      } else {
        setStatus("invalid");
      }
      setMessage(json.message ?? "Verification failed.");
    } catch {
      setStatus("invalid");
      setMessage("Network error. Please check your connection and try again.");
    }
  }, [router, completeLogin]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("no-token");
      return;
    }
    verify(token);
  }, [searchParams, verify]);

  // ── UI states ─────────────────────────────────────────────────────────────
  const configs: Record<Status, {
    emoji: string;
    heading: string;
    color: string;
    bg: string;
  }> = {
    verifying: {
      emoji: "⏳",
      heading: "Verifying your email…",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.08)",
    },
    success: {
      emoji: "✅",
      heading: "Email verified!",
      color: "#10b981",
      bg: "rgba(16,185,129,.08)",
    },
    expired: {
      emoji: "⏰",
      heading: "Link expired",
      color: "#f59e0b",
      bg: "rgba(245,158,11,.08)",
    },
    used: {
      emoji: "ℹ️",
      heading: "Already verified",
      color: "#3b82f6",
      bg: "rgba(59,130,246,.08)",
    },
    invalid: {
      emoji: "❌",
      heading: "Invalid link",
      color: "#ef4444",
      bg: "rgba(239,68,68,.08)",
    },
    "no-token": {
      emoji: "🔗",
      heading: "No verification token",
      color: "#ef4444",
      bg: "rgba(239,68,68,.08)",
    },
  };

  const cfg = configs[status];

  return (
    // Header and footer come from (auth)/layout.tsx.
    <div className="auth-shell">
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "48px 44px",
            maxWidth: 480,
            width: "100%",
            boxShadow: "0 8px 40px rgba(30,27,75,.10)",
            textAlign: "center",
          }}
        >
          {/* Animated icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: cfg.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.2rem",
              margin: "0 auto 24px",
              border: `2px solid ${cfg.color}30`,
              animation: status === "verifying" ? "pulse-ring 1.5s ease infinite" : undefined,
            }}
          >
            {status === "verifying" ? (
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            ) : (
              cfg.emoji
            )}
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#1e1b4b",
              margin: "0 0 12px",
              letterSpacing: "-.02em",
            }}
          >
            {cfg.heading}
          </h1>

          <p
            style={{
              fontSize: "0.95rem",
              color: "#4b5563",
              lineHeight: 1.65,
              margin: "0 0 28px",
            }}
          >
            {status === "verifying" && "Checking your verification link — please wait."}
            {status === "success"   && (
              <>
                {message || "Your email has been verified."}{" "}
                <strong>Redirecting you to your dashboard…</strong>
              </>
            )}
            {status === "expired"   && (message || "Your verification link has expired.")}
            {status === "used"      && (message || "Your email is already verified.")}
            {status === "invalid"   && (message || "This verification link is invalid or malformed.")}
            {status === "no-token"  && "No verification token was found in the URL."}
          </p>

          {/* Action buttons */}
          {(status === "expired" || status === "invalid" || status === "no-token") && (
            <Link href="/resend-verification" className="auth-submit-btn" style={{ display: "inline-flex", textDecoration: "none" }}>
              Resend verification email <ArrowIcon />
            </Link>
          )}

          {status === "used" && (
            <Link href="/login" className="auth-submit-btn" style={{ display: "inline-flex", textDecoration: "none" }}>
              Go to login <ArrowIcon />
            </Link>
          )}

          {status === "success" && (
            <div
              style={{
                background: "rgba(16,185,129,.08)",
                border: "1px solid rgba(16,185,129,.25)",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: "0.85rem",
                color: "#059669",
                fontWeight: 600,
              }}
            >
              ✅ Redirecting you automatically…
            </div>
          )}

          {status !== "verifying" && status !== "success" && (
            <div style={{ marginTop: 16 }}>
              <Link href="/login" style={{ fontSize: "0.88rem", color: "#f97316", fontWeight: 600 }}>
                ← Back to login
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(124,58,237,.4); }
          70%  { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        }
      `}</style>
    </div>
  );
}
