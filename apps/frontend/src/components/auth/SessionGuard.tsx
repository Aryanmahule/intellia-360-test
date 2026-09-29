"use client";

/**
 * Keeps a signed-in module honest about whose session it is showing.
 *
 * proxy.ts only runs when the browser asks the server for something, so a tab
 * that is already open keeps rendering its old account after another tab signs
 * in as someone else or signs out. Its next navigation is then redirected with
 * no explanation — a student's "Quizzes" click lands in the Teacher Console,
 * "Leaderboard" lands on /login. AuthContext re-checks the session when that
 * happens elsewhere and whenever the tab regains focus; this guard turns the
 * result into a clear, blocking notice instead of a surprise redirect.
 */

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccessArea, dashboardFor, type AppArea } from "@intellia360/shared/auth/roles";
import type { UserRole } from "@intellia360/shared/types/auth";

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN:   "Admin",
  STUDENT: "Student",
  PARENT:  "Parent",
  TEACHER: "Teacher",
  SCHOOL:  "School",
  EDITOR:  "Editor",
};

const AREA_LABEL: Record<AppArea, string> = {
  student: "the student learning portal",
  teacher: "the Teacher Console",
  editor:  "the content editor",
  admin:   "the admin console",
};

/** Where each role lands, for the "access updated" notice. */
const HOME_LABEL: Record<UserRole, string> = {
  ADMIN:   "the admin console",
  STUDENT: "the student learning portal",
  PARENT:  "the student learning portal",
  TEACHER: "the Teacher Console",
  SCHOOL:  "the Teacher Console",
  EDITOR:  "the content editor",
};

export default function SessionGuard({
  area,
  children,
}: {
  area: AppArea;
  children: React.ReactNode;
}) {
  const { user, status, logout, roleUpdated } = useAuth();
  const pathname = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const primaryAction = useRef<HTMLElement | null>(null);

  const ended = status === "unauthenticated";
  const otherAccount =
    status === "authenticated" && user && !canAccessArea(user.role, area) ? user : null;
  const blocked = ended || otherAccount !== null;
  // Same account with a new role (an administrator approved a request): move
  // the user on to their new home rather than treating it as another account.
  const upgraded = otherAccount !== null && roleUpdated;
  const pending =
    status === "authenticated" && !!user?.requestedRole && user.requestedRole !== user.role && !blocked;
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  useEffect(() => {
    if (blocked) primaryAction.current?.focus();
  }, [blocked]);

  useEffect(() => {
    if (!upgraded || !otherAccount) return;
    const target = dashboardFor(otherAccount.role);
    const timer = window.setTimeout(() => window.location.assign(target), 2500);
    return () => window.clearTimeout(timer);
  }, [upgraded, otherAccount]);

  // Clears whatever session cookie is left (a deleted account can still hold a
  // valid token, which the proxy would otherwise bounce off /login) and opens
  // the sign-in page with a way back to this one.
  const signInAgain = async () => {
    setBusy(true);
    setFailed(false);
    // logout() navigates away on success and only returns when it failed.
    if (!(await logout({ next: pathname }))) {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      <div style={{ display: "contents" }} inert={blocked}>
        {children}
      </div>

      {blocked && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-guard-title"
          aria-describedby="session-guard-text"
          style={overlayStyle}
        >
          <div style={cardStyle}>
            <div aria-hidden="true" style={iconStyle}>
              {ended ? "🔒" : upgraded ? "🎉" : "🔄"}
            </div>

            <h2 id="session-guard-title" style={titleStyle}>
              {ended ? "Your session has ended" : upgraded ? "Your access has been updated" : "You’re signed in as someone else"}
            </h2>

            <p id="session-guard-text" style={textStyle}>
              {upgraded && otherAccount
                ? `You now have ${ROLE_LABEL[otherAccount.role]} access. Taking you to ${HOME_LABEL[otherAccount.role]}…`
                : otherAccount
                ? `This browser is now signed in as ${otherAccount.name} (${ROLE_LABEL[otherAccount.role]}), which can’t open ${AREA_LABEL[area]}. Signing in on another tab changes the account for every tab.`
                : "You were signed out, possibly from another tab or window. Sign in again to pick up where you left off."}
            </p>

            {failed && (
              <p role="alert" style={errorStyle}>
                Couldn’t reach the server. Check your connection and try again.
              </p>
            )}

            <div style={actionsStyle}>
              {otherAccount ? (
                <>
                  <a
                    ref={(el) => {
                      primaryAction.current = el;
                    }}
                    href={dashboardFor(otherAccount.role)}
                    style={primaryStyle}
                  >
                    {upgraded ? "Open it now" : "Go to my dashboard"}
                  </a>
                  {!upgraded && (
                    <button type="button" disabled={busy} onClick={signInAgain} style={secondaryStyle}>
                      {busy ? "Signing out…" : "Sign out and switch account"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  ref={(el) => {
                    primaryAction.current = el;
                  }}
                  type="button"
                  disabled={busy}
                  onClick={signInAgain}
                  style={primaryStyle}
                >
                  {busy ? "Opening sign-in…" : "Sign in again"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pending && !noticeDismissed && user?.requestedRole && (
        <div role="status" aria-live="polite" style={noticeStyle}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>⏳</span>
          <span style={{ flex: 1 }}>
            Your <strong>{ROLE_LABEL[user.requestedRole]}</strong> access request is waiting for an
            administrator. This page switches over automatically once it’s approved.
          </span>
          <button
            type="button"
            onClick={() => setNoticeDismissed(true)}
            aria-label="Dismiss notice"
            style={noticeCloseStyle}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

// Inline styles: the guard mounts inside four modules with four unrelated
// stylesheets, and must look the same in all of them.

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483000,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(10, 20, 40, 0.55)",
  backdropFilter: "blur(3px)",
  fontFamily: "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "min(440px, 100%)",
  padding: "28px 26px 24px",
  borderRadius: 20,
  background: "#ffffff",
  color: "#0f172a",
  boxShadow: "0 30px 70px rgba(15, 23, 42, 0.28)",
  textAlign: "center",
};

const iconStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  margin: "0 auto 14px",
  display: "grid",
  placeItems: "center",
  borderRadius: 16,
  background: "#eef5ff",
  fontSize: 26,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.25,
};

const textStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  fontSize: 14,
  lineHeight: 1.6,
};

const errorStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#b91c1c",
  fontSize: 13,
  fontWeight: 600,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 20,
};

const primaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  border: 0,
  borderRadius: 12,
  background: "#1769ff",
  color: "#ffffff",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryStyle: React.CSSProperties = {
  ...primaryStyle,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#1e3a8a",
};

const noticeStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 16,
  transform: "translateX(-50%)",
  zIndex: 2147482000,
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "min(560px, calc(100% - 32px))",
  padding: "12px 14px",
  borderRadius: 14,
  background: "#1e1b4b",
  color: "#ffffff",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
  fontFamily: "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontSize: 13.5,
  lineHeight: 1.5,
};

const noticeCloseStyle: React.CSSProperties = {
  flex: "0 0 auto",
  width: 28,
  height: 28,
  border: 0,
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.14)",
  color: "#ffffff",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
};
