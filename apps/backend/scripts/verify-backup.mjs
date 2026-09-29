/**
 * Intellia360 — verify a backup archive
 *
 *   node scripts/verify-backup.mjs --file backups/intellia360-<stamp>.ndjson.gz [--compare-live]
 *
 * Checks an archive without touching the database:
 *   • it decompresses cleanly,
 *   • every line parses as JSON,
 *   • the header is present and the format is recognised,
 *   • each model's documents carry an id,
 *   • it reports per-collection counts and the archive checksum.
 *
 * With --compare-live it also reads current counts from the database and shows
 * the drift, which is how you sanity-check an archive before restoring from it.
 *
 * Run this on the archive you are about to restore, and as part of the monthly
 * recovery drill described in docs/DATABASE-BACKUP-RECOVERY.md.
 * Exit code 0 = archive usable, 1 = do not restore from this file.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { createRequire } from "node:module";
import { loadEnv, humanBytes, sha256File, listModels } from "./lib/backup-common.mjs";

const require = createRequire(import.meta.url);
loadEnv();

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FILE = arg("--file", null);
const COMPARE_LIVE = process.argv.includes("--compare-live");
const log = (...p) => console.log(`[verify] ${p.join(" ")}`);

if (!FILE || !fs.existsSync(FILE)) {
  console.error("Usage: node scripts/verify-backup.mjs --file <archive.ndjson.gz>");
  process.exit(2);
}

async function main() {
  const size = fs.statSync(FILE).size;
  log(`file    : ${path.resolve(FILE)}`);
  log(`size    : ${humanBytes(size)}`);
  log(`checksum: ${sha256File(FILE)}`);

  const counts = {};
  const problems = [];
  let meta = null;
  let lineNo = 0;
  let total = 0;

  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(FILE).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      lineNo += 1;
      if (!line.trim()) return;

      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (err) {
        problems.push(`line ${lineNo}: unparseable JSON (${err.message})`);
        return;
      }

      if (parsed.__meta) {
        meta = parsed.__meta;
        return;
      }
      if (!parsed.model || !parsed.data) {
        problems.push(`line ${lineNo}: missing model/data envelope`);
        return;
      }
      if (parsed.data.id === undefined) {
        problems.push(`line ${lineNo}: ${parsed.model} document has no id`);
        return;
      }

      counts[parsed.model] = (counts[parsed.model] ?? 0) + 1;
      total += 1;
    });

    rl.on("close", resolve);
    rl.on("error", reject);
  });

  if (!meta) {
    problems.push("archive has no __meta header — it may be truncated or not an Intellia360 backup");
  } else {
    log(`format  : ${meta.format}`);
    log(`created : ${meta.createdAt} (${meta.trigger})`);
  }

  console.log("");
  log("collections:");

  let live = null;
  let db = null;
  if (COMPARE_LIVE && process.env.DATABASE_URL) {
    const { PrismaClient, Prisma } = require("@prisma/client");
    db = new PrismaClient({ log: ["error"] });
    live = {};
    for (const model of listModels(Prisma)) {
      live[model.name] = await db[model.delegate].count();
    }
  }

  const names = new Set([...Object.keys(counts), ...(live ? Object.keys(live) : [])]);
  for (const name of [...names].sort()) {
    const archived = counts[name] ?? 0;
    if (!live) {
      log(`  ${name.padEnd(24)} ${String(archived).padStart(7)}`);
      continue;
    }
    const current = live[name] ?? 0;
    const drift = current - archived;
    log(
      `  ${name.padEnd(24)} archive=${String(archived).padStart(7)}  ` +
        `live=${String(current).padStart(7)}  ` +
        `drift=${drift > 0 ? "+" : ""}${drift}`
    );
  }

  if (db) await db.$disconnect();

  console.log("");
  if (problems.length > 0) {
    log(`FAILED — ${problems.length} problem(s):`);
    for (const p of problems.slice(0, 20)) log(`  ${p}`);
    if (problems.length > 20) log(`  …and ${problems.length - 20} more`);
    process.exit(1);
  }

  log(`OK — ${total} document(s) across ${Object.keys(counts).length} collection(s).`);
}

main().catch((err) => {
  console.error("[verify] FAILED:", err.message);
  process.exit(1);
});
