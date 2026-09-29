"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { postLoginPath } from "@intellia360/shared/auth/roles";
import type { AuthUser, LoginInput, RegisterInput, UserRole } from "@intellia360/shared/types/auth";
import { apiFetch } from "@/lib/api";

// ─── Context Shape ────────────────────────────────────────────────────────────

/**
 * `unknown` means the last session check failed for a reason other than "not
 * signed in" (network error, 5xx). It must not be treated as a sign-out.
 */
export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "unknown";

interface AuthContextValue {
  user:            AuthUser | null;
  status:          SessionStatus;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:    (input: LoginInput, options?: { next?: string | null }) => Promise<{ success: boolean; message: string; unverified?: boolean }>;
  /** Adopts a session a sign-in endpoint has already issued (Google sign-in, email verification). */
  completeLogin: (user: AuthUser, next?: string | null) => void;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  /** Re-reads the session from the server. */
  refreshSession: () => Promise<void>;
  /**
   * Ends the session and leaves for /login with a full page load. Resolves
   * false — and stays on the page — when the server could not be reached to
   * clear the session cookie.
   */
  logout:   (options?: { next?: string }) => Promise<boolean>;
  hasRole:  (...roles: UserRole[]) => boolean;
  /**
   * True once the signed-in account's role changed while the page was open —
   * an administrator approved a request. SessionGuard moves the user on.
   */
  roleUpdated: boolean;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  /** Per-field validation errors keyed by form field name. */
  errors?: Record<string, string[]>;
  /** False when the account was created but the verification email bounced. */
  emailSent?: boolean;
  /** Present when the account was verified on the spot and is already signed in. */
  user?: AuthUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Cross-tab session signal ─────────────────────────────────────────────────
// The session cookie is shared by every tab in the browser, so signing in or
// out in one tab silently changes the session of all the others. Tabs tell
// each other when that happens so they can re-check immediately.

const AUTH_CHANNEL = "intellia360-auth";

/** Minimum gap between the session checks triggered by a tab regaining focus. */
const FOCUS_RECHECK_MS = 5000;

/** How often to look for an administrator's decision on a pending role request. */
const ROLE_REQUEST_POLL_MS = 8000;

const hasBroadcastChannel = () => typeof BroadcastChannel !== "undefined";

function announceSessionChange(type: "login" | "logout") {
  const signal = { type, at: Date.now() };
  try {
    if (hasBroadcastChannel()) {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage(signal);
      channel.close();
    } else {
      localStorage.setItem(AUTH_CHANNEL, JSON.stringify(signal));
    }
  } catch {
    // No channel or storage — other tabs still re-check when they regain focus.
  }
}

type SessionCheck =
  | { kind: "user"; user: AuthUser }
  | { kind: "signed-out" }
  | { kind: "failed" };

/** Asks the server who the session cookie belongs to. */
async function checkSession(): Promise<SessionCheck> {
  try {
    const res = await apiFetch("/api/auth/me", { cache: "no-store" });
    if (res.status === 401) return { kind: "signed-out" };
    const json = res.ok ? await res.json() : null;
    if (json?.success && json.data) return { kind: "user", user: json.data as AuthUser };
    return { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

/**
 * Crosses between the public site and a signed-in module with a full page
 * load rather than a client-side navigation.
 *
 * A client-side navigation keeps the previous page's stylesheets in the
 * document. The public site's CSS includes unscoped class rules
 * (.section-eyebrow, .courses-section, …) that restyled student and teacher
 * pages reached that way, and the client router cache can still hold
 * responses fetched under the previous session — a /login prefetched while
 * signed in is a redirect to the dashboard. A fresh document avoids both.
 */
function leaveFor(path: string, { replace = false } = {}) {
  if (replace) window.location.replace(path);
  else window.location.assign(path);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [roleUpdated, setRoleUpdated] = useState(false);
  // The user last applied, readable from callbacks without re-creating them.
  const userRef = useRef<AuthUser | null>(null);

  const lastCheckAt = useRef(0);
  // Set while the page is navigating away after a sign-in or sign-out, so the
  // tab's own session signal doesn't flash a stale state before it unloads.
  const leaving = useRef(false);

  const applySession = useCallback((check: SessionCheck) => {
    if (leaving.current) return;
    if (check.kind === "signed-out") {
      userRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
    } else if (check.kind === "user") {
      const fresh = check.user;
      const prev = userRef.current;
      // Same account, new role: an administrator changed it (e.g. approved an
      // Editor request). /api/auth/me has already re-issued the session cookie.
      if (prev && prev.id === fresh.id && prev.role !== fresh.role) setRoleUpdated(true);
      // Keep the same object when nothing changed, so a focus check does not
      // re-render every consumer.
      const unchanged =
        prev !== null &&
        prev.id === fresh.id &&
        prev.role === fresh.role &&
        prev.name === fresh.name &&
        prev.email === fresh.email &&
        (prev.requestedRole ?? null) === (fresh.requestedRole ?? null);
      if (!unchanged) {
        userRef.current = fresh;
        setUser(fresh);
      }
      setStatus("authenticated");
    } else {
      // Network error or 5xx — keep whatever we last knew.
      setStatus((prev) => (prev === "loading" ? "unknown" : prev));
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (leaving.current) return;
    lastCheckAt.current = Date.now();
    applySession(await checkSession());
  }, [applySession]);

  // Restore session from the httpOnly cookie on every page load
  useEffect(() => {
    let cancelled = false;
    lastCheckAt.current = Date.now();
    (async () => {
      const check = await checkSession();
      if (!cancelled) applySession(check);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // Re-check when another tab signs in or out, and when this tab comes back
  // into view. Without this a stale tab only finds out on its next click, which
  // the proxy then redirects into another role's console or back to /login.
  useEffect(() => {
    const recheck = () => void refreshSession();
    const recheckIfStale = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastCheckAt.current < FOCUS_RECHECK_MS) return;
      recheck();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_CHANNEL) recheck();
    };

    let channel: BroadcastChannel | null = null;
    if (hasBroadcastChannel()) {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = recheck;
    } else {
      window.addEventListener("storage", onStorage);
    }
    document.addEventListener("visibilitychange", recheckIfStale);
    window.addEventListener("focus", recheckIfStale);

    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", recheckIfStale);
      window.removeEventListener("focus", recheckIfStale);
    };
  }, [refreshSession]);

  // While a role request (e.g. Editor) waits for an administrator, look again
  // every few seconds so an approval switches the user over without a re-login.
  const upgradePending =
    status === "authenticated" && !!user?.requestedRole && user.requestedRole !== user.role;

  useEffect(() => {
    if (!upgradePending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshSession();
    }, ROLE_REQUEST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [upgradePending, refreshSession]);

  // ── Complete a sign-in ─────────────────────────────────────────────────────
  const completeLogin = useCallback((authUser: AuthUser, next?: string | null) => {
    userRef.current = authUser;
    setUser(authUser);
    setStatus("authenticated");
    lastCheckAt.current = Date.now();
    leaving.current = true;
    announceSessionChange("login");
    leaveFor(postLoginPath(authUser.role, next));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (input: LoginInput, options?: { next?: string | null }) => {
    const res  = await apiFetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
    });
    const json = await res.json();

    // Unverified account — 403 with errors.email === ["unverified"]
    if (!json.success && json.errors?.email?.[0] === "unverified") {
      return { success: false, message: json.message, unverified: true };
    }

    if (json.success && json.data) {
      completeLogin(json.data as AuthUser, options?.next);
    }

    return { success: json.success, message: json.message };
  }, [completeLogin]);

  // ── Register ───────────────────────────────────────────────────────────────
  // When emailed verification links are required, register only queues the
  // email. Otherwise the account is verified on creation and the response
  // carries the signed-in user, which the page hands to completeLogin().
  const register = useCallback(async (input: RegisterInput): Promise<RegisterResult> => {
    const res  = await apiFetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
    });
    const json = await res.json();
    return {
      success:   json.success,
      message:   json.message,
      errors:    json.errors,
      emailSent: json.data?.emailSent,
      user:      json.data?.user as AuthUser | undefined,
    };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (options?: { next?: string }) => {
    try {
      const res = await apiFetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      if (!res.ok) return false;
    } catch {
      return false;
    }

    leaving.current = true;
    try {
      localStorage.removeItem("user");
    } catch {
      // Storage unavailable — nothing to clear.
    }
    announceSessionChange("logout");

    // A full page load (see leaveFor) also drops every in-memory store of the
    // old session — teacher data, student progress — along with the router
    // cache, whose stale /login redirect used to send router.push("/login")
    // straight back into the console. `replace` keeps the signed-in page out of
    // the back-button history.
    const target = options?.next ? `/login?next=${encodeURIComponent(options.next)}` : "/login";
    leaveFor(target, { replace: true });
    return true;
  }, []);

  // ── hasRole ────────────────────────────────────────────────────────────────
  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: !!user,
        isLoading: status === "loading",
        login,
        completeLogin,
        register,
        refreshSession,
        logout,
        hasRole,
        roleUpdated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
