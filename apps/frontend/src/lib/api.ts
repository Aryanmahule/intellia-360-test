/**
 * Where the frontend reaches the backend API.
 *
 * The frontend is a static export (S3 + CloudFront) and the API is a separate
 * origin (apps/backend), so every `/api/...` call is sent to
 * NEXT_PUBLIC_API_URL — e.g. https://api.yourdomain.com in production and
 * http://localhost:4000 in development — with the session cookie included.
 *
 * NEXT_PUBLIC_API_URL is inlined at build time. Left empty, calls stay
 * same-origin (a reverse proxy serving both on one host).
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** Absolute URL of an API path. Anything that is not an `/api/` path is returned unchanged. */
export function apiUrl(path: string): string {
  return path.startsWith("/api/") ? `${API_URL}${path}` : path;
}

function isApiRequest(url: string): boolean {
  return url.startsWith("/api/") || (API_URL !== "" && url.startsWith(`${API_URL}/api/`));
}

/**
 * `fetch` for the app: API calls go to the backend origin and carry the
 * httpOnly session cookie (`credentials: "include"`); any other URL is fetched
 * exactly as `fetch` would.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === "string" && isApiRequest(input)) {
    return fetch(apiUrl(input), { credentials: "include", ...init });
  }
  return fetch(input, init);
}
