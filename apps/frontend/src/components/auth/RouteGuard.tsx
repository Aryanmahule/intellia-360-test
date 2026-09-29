"use client";

/**
 * Applies the route rules the Next.js proxy used to enforce on the server.
 *
 * The frontend is now a static export served from S3/CloudFront, so nothing
 * runs before a page is sent. This guard makes the same three decisions in the
 * browser, from the session AuthContext reads off the API (/api/auth/me):
 *
 *   • signed in, on an auth page (/login, /register, …) → their dashboard
 *   • signed out, inside a protected area              → /login?next=<path>
 *   • signed in, in an area their role may not open    → their dashboard
 *
 * Like the proxy it decides once per page load and per navigation, with a
 * full-page `location.replace` (the proxy answered with a 307). A session that
 * changes while a page stays open — another tab signing out — is left to
 * SessionGuard, which explains it instead of redirecting.
 *
 * Protected and auth pages render nothing until the session is known, so a
 * signed-out visitor never sees a console's shell. The API still authorises
 * every request itself; this guard only decides which page to show.
 */

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { areaForPath, canAccessArea, dashboardFor } from "@intellia360/shared/auth/roles";
import type { AuthUser } from "@intellia360/shared/types/auth";
import type { SessionStatus } from "@/context/AuthContext";

/** Auth pages a signed-in user is sent away from (formerly PUBLIC_ROUTES in proxy.ts). */
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Where `pathname` must send this visitor, or null to show it. */
function redirectTarget(pathname: string, status: SessionStatus, user: AuthUser | null): string | null {
  const area = areaForPath(pathname);

  if (status === "authenticated" && user) {
    if (matches(pathname, AUTH_ROUTES)) return dashboardFor(user.role);
    if (area && !canAccessArea(user.role, area)) return dashboardFor(user.role);
    return null;
  }

  if (status === "unauthenticated" && area) {
    return `/login?next=${encodeURIComponent(pathname)}`;
  }

  // "unknown": the API could not be reached. The proxy never blocked on that;
  // the page shows and its own API calls report the problem.
  return null;
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname() ?? "/";
  // The last pathname already checked against a known session.
  const [settledPath, setSettledPath] = useState<string | null>(null);

  const guarded = areaForPath(pathname) !== null || matches(pathname, AUTH_ROUTES);
  const decided = status !== "loading" && settledPath !== pathname;
  const target = decided ? redirectTarget(pathname, status, user) : null;

  // This path may be shown: remember it, so a later session change on the same
  // page is left to SessionGuard. (Adjusting state during render, as React
  // recommends for state derived from a changed input.)
  if (decided && !target) setSettledPath(pathname);

  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  if (target || (guarded && status === "loading")) return null;
  return <>{children}</>;
}
