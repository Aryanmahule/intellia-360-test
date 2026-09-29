import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
// Intellia360 frontend — static export for S3 + CloudFront
// ─────────────────────────────────────────────────────────────
//
// `next build` writes the whole site to ./out. There is no server:
//
//   • API calls go to NEXT_PUBLIC_API_URL (apps/backend) — see src/lib/api.ts.
//   • Route protection runs in the browser — src/components/auth/RouteGuard.tsx.
//   • Security headers (CSP, HSTS, X-Frame-Options, …) and the HTTP→HTTPS
//     redirect are set by CloudFront — deploy/cloudfront/.
//   • Dynamic routes ([id], [gradeId], …) export one shell each, which
//     CloudFront serves for every id — src/lib/route-placeholder.ts.

// Dependencies are hoisted to the monorepo root's node_modules (npm workspaces).
const monorepoRoot = path.resolve(__dirname, "../..");

interface DynamicRoute {
  prefix: string[];
  params: number;
}

/**
 * The dynamic routes CloudFront maps to their placeholder shell, read from the
 * router function itself so development and production share one table.
 */
function dynamicRoutes(): DynamicRoute[] {
  const source = fs.readFileSync(
    path.join(monorepoRoot, "deploy", "cloudfront", "frontend-router.js"),
    "utf8"
  );
  return new Function(`${source}\nreturn DYNAMIC_ROUTES;`)() as DynamicRoute[];
}

export default function config(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Static export for builds. `next dev` would otherwise reject every id a
    // dynamic route did not pre-render; the rewrites below give it CloudFront's
    // behaviour instead.
    output: isDev ? undefined : "export",

    // The image optimizer needs a server; images are served as they are.
    images: {
      unoptimized: true,
    },

    // packages/shared is TypeScript source, compiled as part of this app.
    transpilePackages: ["@intellia360/shared"],

    turbopack: {
      root: monorepoRoot,
    },
    outputFileTracingRoot: monorepoRoot,

    // Development only: serve each dynamic route's placeholder shell for any
    // id, as CloudFront does in production (deploy/cloudfront/frontend-router.js).
    // Static pages beside a dynamic route (/student/lesson/video) are matched
    // first, because these run after the filesystem routes.
    ...(isDev
      ? {
          async rewrites() {
            return dynamicRoutes().map(({ prefix, params }) => {
              const base = "/" + prefix.join("/");
              const ids = Array.from({ length: params }, (_, i) => `/:id${i}`).join("");
              return { source: base + ids, destination: base + "/_".repeat(params) };
            });
          },
        }
      : {}),
  };
}
