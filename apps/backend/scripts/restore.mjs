/**
 * Intellia360 — database restore
 *
 *   node scripts/restore.mjs --file backups/intellia360-<stamp>.ndjson.gz [options]
 *
 * Options
 *   --file <path>      Archive to restore from (required).
 *   --mode merge       Upsert every document, leaving anything not in the
 *                      archive untouched. DEFAULT — the safe option.
 *   --mode replace     Empty each restored collection first, then load the
 *                      archive. Use only for a true point-in-time rollback.
 *   --models A,B       Restore only these models (e.g. "User,StudentProfile").
 *   --dry-run          Report what would change and exit without writing.
 *   --yes              Skip the interactive confirmation (for automation).
 *
 * This script writes to a live database, so it defaults to the least
 * destructive behaviour and refuses to run `replace` without an explicit
 * confirmation. Always `--dry-run` first.
 *
 * The full runbook is in docs/DATABASE-BACKUP-RECOVERY.md.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { createRequire } from "node:module";
import { loadEnv, requireEnv, listModels, sha256File } from "./lib/backup-common.mjs";

const require = createRequire(import.meta.url);
loadEnv();
const DATABASE_URL = requireEnv("DATABASE_URL");

const { PrismaClient, Prisma } = require("@prisma/client");

/* ── Arguments ────────────────────────────────────────────────────────────── */

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (flag) => process.argv.includes(flag);

const FILE = arg("--file", null);
const MODE = arg("--mode", "merge");
const ONLY = arg("--models", null);
const DRY_RUN = has("--dry-run");
const ASSUME_YES = has("--yes");

if (!FILE) {
  console.error("Usage: node scripts/restore.mjs --file <archive.ndjson.gz> [--dry-run]");
  process.exit(2);
}
if (!fs.existsSync(FILE)) {
  console.error(`Archive not found: ${FILE}`);
  process.exit(2);
}
if (MODE !== "merge" && MODE !== "replace") {
  console.error(`--mode must be "merge" or "replace" (got "${MODE}")`);
  process.exit(2);
}

const db = new PrismaClient({ log: ["error"] });
const log = (...p) => console.log(`[restore] ${p.join(" ")}`);

/** Undo backup.mjs's type tagging. */
function reviver(_key, value) {
  if (value && typeof value === "object" && value.__type === "Date") return new Date(value.value);
  if (value && typeof value === "object" && value.__type === "BigInt") return BigInt(value.value);
  return value;
}

async function confirm(question) {
  if (ASSUME_YES) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

/* ── Read the archive into memory, grouped by model ───────────────────────── */

async function readArchive(file) {
  const byModel = new Map();
  let meta = null;

  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(file).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });
    rl.on("line", (line) => {
      if (!line) return;
      const parsed = JSON.parse(line, reviver);
      if (parsed.__meta) {
        meta = parsed.__meta;
        return;
      }
      if (!byModel.has(parsed.model)) byModel.set(parsed.model, []);
      byModel.get(parsed.model).push(parsed.data);
    });
    rl.on("close", resolve);
    rl.on("error", reject);
  });

  return { meta, byModel };
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  // Show the operator exactly which database they are about to write to —
  // restoring a production archive into the wrong cluster is the classic
  // recovery-day mistake.
  const target = DATABASE_URL.replace(/\/\/[^@]*@/, "//***:***@");
  log(`archive : ${path.resolve(FILE)}`);
  log(`checksum: ${sha256File(FILE)}`);
  log(`target  : ${target}`);
  log(`mode    : ${MODE}${DRY_RUN ? " (dry run)" : ""}`);

  const { meta, byModel } = await readArchive(FILE);
  if (meta) log(`created : ${meta.createdAt} (${meta.trigger})`);

  const schemaModels = listModels(Prisma);
  const wanted = ONLY ? new Set(ONLY.split(",").map((s) => s.trim())) : null;

  const plan = schemaModels
    .filter((m) => byModel.has(m.name))
    .filter((m) => !wanted || wanted.has(m.name));

  if (plan.length === 0) {
    log("nothing to restore — no matching models in the archive.");
    return;
  }

  console.log("");
  log("plan:");
  for (const model of plan) {
    const incoming = byModel.get(model.name).length;
    const current = await db[model.delegate].count();
    log(
      `  ${model.name.padEnd(24)} archive=${String(incoming).padStart(6)}  ` +
        `live=${String(current).padStart(6)}  ` +
        (MODE === "replace" ? `→ replace (${current} row(s) removed first)` : "→ upsert")
    );
  }
  console.log("");

  if (DRY_RUN) {
    log("dry run — no changes written.");
    return;
  }

  if (MODE === "replace") {
    const ok = await confirm(
      `This DELETES all rows in ${plan.length} collection(s) on ${target}\n` +
        `and replaces them with the archive contents. Type "yes" to proceed: `
    );
    if (!ok) {
      log("aborted.");
      return;
    }
  }

  for (const model of plan) {
    const rows = byModel.get(model.name);

    if (MODE === "replace") {
      const removed = await db[model.delegate].deleteMany({});
      log(`${model.name}: cleared ${removed.count} row(s)`);
    }

    let written = 0;
    for (const row of rows) {
      const { id, ...rest } = row;
      // Upsert rather than create so a merge restore is idempotent and can be
      // re-run safely after a partial failure.
      await db[model.delegate].upsert({
        where: { id },
        create: row,
        update: rest,
      });
      written += 1;
    }
    log(`${model.name}: restored ${written} document(s)`);
  }

  console.log("");
  log("restore complete. Verify with the checklist in");
  log("docs/DATABASE-BACKUP-RECOVERY.md before returning the app to service.");
}

main()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[restore] FAILED:", err.message);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
