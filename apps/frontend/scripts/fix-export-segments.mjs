/**
 * Normalises the router's segment prefetch files in ./out after `next build`.
 *
 * The client requests them as flat files, e.g.
 *   /student/leaderboard/__next.student.leaderboard.__PAGE__.txt
 * and on Linux `next build` writes exactly that. On Windows, Next.js 16 builds
 * the name from a backslash-separated path and writes nested folders instead
 * (__next.student/leaderboard/__PAGE__.txt), which the client never finds, so
 * client-side navigation falls back to full page loads. This moves any such
 * files to their flat names. On Linux (CI) it finds nothing to do.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
let moved = 0;

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const file of filesUnder(full)) {
        const rest = path.relative(full, file).split(path.sep).join(".");
        fs.renameSync(file, path.join(dir, `${entry.name}.${rest}`));
        moved++;
      }
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      walk(full);
    }
  }
}

if (!fs.existsSync(outDir)) {
  console.error("[fix-export-segments] ./out is missing — run `next build` first.");
  process.exit(1);
}
walk(outDir);
console.log(`[fix-export-segments] ${moved ? `flattened ${moved} segment files` : "nothing to fix"}`);
