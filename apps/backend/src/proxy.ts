import { NextRequest, NextResponse } from "next/server";

/**
 * Cross-origin access to the API.
 *
 * The frontend is a separate origin (S3/CloudFront, e.g. https://yourdomain.com)
 * and calls this API (e.g. https://api.yourdomain.com) with the httpOnly
 * `intellia_session` cookie. Browsers only allow that for origins the API names
 * explicitly, so every /api response carries CORS headers for the origins in
 * CORS_ORIGIN (comma-separated, no trailing slash).
 *
 * The page guards that used to live here (redirects to /login and between role
 * consoles) moved with the pages to apps/frontend (components/auth/RouteGuard).
 * Every API route still checks the session itself.
 */

const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean)
);

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PREFLIGHT_MAX_AGE = "600";

function applyCors(headers: Headers, origin: string, request: NextRequest) {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  const requested = request.headers.get("access-control-request-headers");
  headers.set("Access-Control-Allow-Headers", requested ?? "Content-Type");
  headers.set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = origin !== null && ALLOWED_ORIGINS.has(origin);

  // Preflight
  if (request.method === "OPTIONS" && request.headers.has("access-control-request-method")) {
    const res = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed) applyCors(res.headers, origin, request);
    res.headers.set("Vary", "Origin");
    return res;
  }

  // A browser attaches Origin to every cross-origin request. With the session
  // cookie now sent cross-origin, refuse state-changing requests from any site
  // not on the list before they reach a route (CSRF). Requests without Origin
  // (server-to-server, curl) are unaffected.
  if (origin && !allowed && STATE_CHANGING.has(request.method) && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { success: false, message: "Origin not allowed" },
      { status: 403, headers: { Vary: "Origin" } }
    );
  }

  const res = NextResponse.next();
  if (allowed) applyCors(res.headers, origin, request);
  res.headers.set("Vary", "Origin");
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
