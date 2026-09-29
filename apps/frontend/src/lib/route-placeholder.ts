/**
 * The placeholder id each dynamic route ([id], [gradeId], …) is exported for.
 *
 * A static export can only pre-render the ids it knows at build time, but
 * lessons, grades and classes are created at runtime. Each dynamic route
 * therefore exports one shell, for this placeholder, and CloudFront serves that
 * shell for every id (deploy/cloudfront/frontend-router.js). The page reads the
 * real id from the URL with useRouteParams (lib/route-params.ts).
 *
 * Server-safe: imported by the routes' page.tsx (generateStaticParams).
 */
export const ROUTE_PLACEHOLDER = "_";

/** `generateStaticParams` result for a route with the given segment names. */
export function placeholderParams<K extends string>(...names: K[]): Record<K, string>[] {
  return [Object.fromEntries(names.map((n) => [n, ROUTE_PLACEHOLDER])) as Record<K, string>];
}
