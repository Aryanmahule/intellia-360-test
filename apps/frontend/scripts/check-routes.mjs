/**
 * Verifies the CloudFront router (deploy/cloudfront/frontend-router.js) against
 * the static export in ./out. Run after `next build`:
 *
 *   npm run check:routes -w @intellia360/frontend
 *
 * Fails when:
 *   • an exported file would not be served at its own path,
 *   • a page is not reachable at its clean URL (/login → login.html),
 *   • a dynamic route ([id], …) does not serve its shell for an arbitrary id,
 *     e.g. a new dynamic route was added without updating DYNAMIC_ROUTES,
 *   • router segment files were written as folders instead of flat files
 *     (see fix-export-segments.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const outDir = path.join(appDir, "out");
const routerFile = path.resolve(appDir, "../../deploy/cloudfront/frontend-router.js");

if (!fs.existsSync(outDir)) {
  console.error("[check-routes] ./out is missing — run `next build` first.");
  process.exit(1);
}

// Load the function exactly as CloudFront runs it: a script defining handler().
const { rewriteUri, handler } = new Function(
  `${fs.readFileSync(routerFile, "utf8")}\nreturn { rewriteUri, handler };`
)();

const failures = [];
const exists = (uri) => fs.existsSync(path.join(outDir, decodeURIComponent(uri)));

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name.startsWith("__next.")) {
      failures.push(`segment folder ${path.relative(outDir, full)} — the client requests flat __next.*.txt files`);
    }
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push("/" + path.relative(outDir, full).split(path.sep).join("/"));
  }
  return files;
}

// 1. Every exported file is served at its own path; pages also at their clean URL.
const files = walk(outDir);
for (const file of files) {
  const direct = handler({ request: { uri: file } }).uri;
  if (file.endsWith(".html")) {
    const clean = file === "/index.html" ? "/" : file.slice(0, -".html".length);
    const served = rewriteUri(clean);
    if (served !== file) failures.push(`page ${clean} → ${served}, expected ${file}`);
  } else if (direct !== file) {
    failures.push(`file ${file} → ${direct}, expected unchanged`);
  }
}

// 2. Every dynamic route serves its shell (page + router data) for any id.
function dynamicPages(dir, segments = []) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "api") continue;
    const next = /^\(.*\)$/.test(entry.name) ? segments : [...segments, entry.name];
    const full = path.join(dir, entry.name);
    const hasPage = fs.readdirSync(full).some((f) => /^page\.(t|j)sx?$/.test(f));
    if (hasPage && next.some((s) => s.startsWith("["))) found.push(next);
    found.push(...dynamicPages(full, next));
  }
  return found;
}

for (const segments of dynamicPages(path.join(appDir, "src", "app"))) {
  const sample = "/" + segments.map((s) => (s.startsWith("[") ? "sample-id-123" : s)).join("/");
  for (const [url, suffix] of [[sample, ""], [`${sample}.txt`, ".txt"]]) {
    const served = rewriteUri(url);
    if (!exists(served)) failures.push(`dynamic ${url} → ${served}, which is not in ./out${suffix ? " (router data)" : ""}`);
  }
}

if (failures.length) {
  console.error(`[check-routes] ${failures.length} problem(s):`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`[check-routes] OK — ${files.length} exported files and every dynamic route resolve correctly.`);
