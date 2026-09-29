/**
 * Intellia360 — rehydrate the filesystem curriculum store from its database mirror
 *
 *   node scripts/restore-curriculum.mjs [--grade grade3] [--path <store path>]
 *                                       [--version <n>] [--dry-run] [--include-deleted]
 *
 * Why this exists
 * ───────────────
 * The editor writes lesson/curriculum JSON into `src/data/grades`, which is part
 * of the build artifact. On an immutable or serverless host those files are
 * reset on every deploy, and they are not covered by a database backup. Every
 * editor write is therefore mirrored into `curriculum_documents`; this script
 * writes the mirror back onto disk.
 *
 * Run it:
 *   • after a deploy, to restore content saved since the last build,
 *   • after an accidental overwrite or a deleted grade,
 *   • as part of a full disaster recovery, once the database is restored.
 *
 * Rolling back one file to an earlier version:
 *   node scripts/restore-curriculum.mjs --path grade1/lessons/ordinal-numbers.json --version 3
 *
 * Seeding the mirror from what is already on disk:
 *   node scripts/restore-curriculum.mjs --seed-mirror
 *
 * The mirror only receives a file when the editor saves it, so on first install
 * it is empty and the curriculum shipped in the repo is not yet recoverable
 * from the database. Run --seed-mirror once, after `prisma db push`, to import
 * the current contents of src/data/grades. It is safe to re-run: unchanged
 * files are skipped and no revision history is fabricated.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadEnv, requireEnv } from "./lib/backup-common.mjs";

const require = createRequire(import.meta.url);
loadEnv();
requireEnv("DATABASE_URL");

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: ["error"] });

const STORE_ROOT = path.resolve(process.cwd(), "src", "data", "grades");
const log = (...p) => console.log(`[curriculum-restore] ${p.join(" ")}`);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (flag) => process.argv.includes(flag);

const GRADE = arg("--grade", null);
const ONE_PATH = arg("--path", null);
const VERSION = arg("--version", null);
const DRY_RUN = has("--dry-run");
const INCLUDE_DELETED = has("--include-deleted");
const SEED_MIRROR = has("--seed-mirror");

/**
 * Resolve a store-relative path safely.
 *
 * The stored `path` is data, and data restored onto a filesystem is exactly
 * where a traversal payload would pay off, so the resolved target is asserted
 * to be inside the store before anything is written.
 */
function safeTarget(relPath) {
  const abs = path.resolve(STORE_ROOT, relPath);
  if (abs !== STORE_ROOT && !abs.startsWith(STORE_ROOT + path.sep)) {
    throw new Error(`Refusing to write outside the curriculum store: ${relPath}`);
  }
  return abs;
}

/** Store-relative paths of every JSON file currently under src/data/grades. */
function walkStore() {
  if (!fs.existsSync(STORE_ROOT)) return [];
  const out = [];

  for (const grade of fs.readdirSync(STORE_ROOT, { withFileTypes: true })) {
    if (!grade.isDirectory()) continue;

    for (const name of ["curriculum.json", "dashboard.json"]) {
      if (fs.existsSync(path.join(STORE_ROOT, grade.name, name))) {
        out.push({ rel: `${grade.name}/${name}`, gradeId: grade.name });
      }
    }

    const lessonsDir = path.join(STORE_ROOT, grade.name, "lessons");
    if (!fs.existsSync(lessonsDir)) continue;
    for (const f of fs.readdirSync(lessonsDir)) {
      if (f.endsWith(".json")) {
        out.push({ rel: `${grade.name}/lessons/${f}`, gradeId: grade.name });
      }
    }
  }
  return out;
}

function classify(rel) {
  const parts = rel.split("/");
  if (parts[1] === "lessons") {
    return { kind: "lesson", lessonId: (parts[2] ?? "").replace(/\.json$/, "") };
  }
  return { kind: parts[1] === "dashboard.json" ? "dashboard" : "curriculum", lessonId: null };
}

/**
 * Import the on-disk curriculum into the mirror.
 *
 * Only creates rows that are missing or whose content has drifted — an
 * unchanged file is left alone so re-running does not inflate version numbers
 * or manufacture revision history that never happened.
 */
async function seedMirror() {
  const files = walkStore();
  if (files.length === 0) {
    log("no curriculum files found under src/data/grades — nothing to seed.");
    return;
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const { rel, gradeId } of files) {
    const abs = safeTarget(rel);
    let content;
    try {
      content = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch (err) {
      log(`SKIP ${rel} — not valid JSON (${err.message})`);
      continue;
    }

    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(content))
      .digest("hex");

    const existing = await db.curriculumDocument.findUnique({
      where: { path: rel },
      select: { id: true, checksum: true, version: true },
    });

    if (existing?.checksum === checksum) {
      unchanged += 1;
      continue;
    }

    const { kind, lessonId } = classify(rel);

    if (DRY_RUN) {
      log(`${existing ? "would update" : "would create"} ${rel}`);
      existing ? (updated += 1) : (created += 1);
      continue;
    }

    if (existing) {
      await db.curriculumDocument.update({
        where: { id: existing.id },
        data: { content, checksum, version: existing.version + 1, deletedAt: null },
      });
      updated += 1;
    } else {
      await db.curriculumDocument.create({
        data: { path: rel, gradeId, kind, lessonId, content, checksum, version: 1 },
      });
      created += 1;
    }
  }

  log(
    `${DRY_RUN ? "would seed" : "seeded"} mirror: ` +
      `${created} created, ${updated} updated, ${unchanged} already current ` +
      `(${files.length} file(s) on disk).`
  );
}

async function main() {
  if (SEED_MIRROR) return seedMirror();

  /* ── Single-file rollback to a specific version ────────────────────────── */
  if (ONE_PATH && VERSION) {
    const doc = await db.curriculumDocument.findUnique({
      where: { path: ONE_PATH },
      select: { id: true, path: true, version: true },
    });
    if (!doc) throw new Error(`No mirrored document at "${ONE_PATH}"`);

    const wanted = parseInt(VERSION, 10);
    const revision =
      wanted === doc.version
        ? await db.curriculumDocument.findUnique({
            where: { id: doc.id },
            select: { content: true },
          })
        : await db.curriculumRevision.findUnique({
            where: { documentId_version: { documentId: doc.id, version: wanted } },
            select: { content: true },
          });

    if (!revision) {
      const available = await db.curriculumRevision.findMany({
        where: { documentId: doc.id },
        select: { version: true },
        orderBy: { version: "asc" },
      });
      throw new Error(
        `Version ${wanted} not found for "${ONE_PATH}". ` +
          `Available: ${[...available.map((r) => r.version), doc.version].join(", ")}`
      );
    }

    const target = safeTarget(doc.path);
    log(`${doc.path}  →  v${wanted}${DRY_RUN ? "  (dry run)" : ""}`);
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(revision.content, null, 2));
    }
    log("done.");
    return;
  }

  /* ── Bulk rehydrate ────────────────────────────────────────────────────── */
  const documents = await db.curriculumDocument.findMany({
    where: {
      ...(INCLUDE_DELETED ? {} : { deletedAt: null }),
      ...(GRADE ? { gradeId: GRADE } : {}),
      ...(ONE_PATH ? { path: ONE_PATH } : {}),
    },
    select: { path: true, content: true, version: true, deletedAt: true, updatedAt: true },
    orderBy: { path: "asc" },
  });

  if (documents.length === 0) {
    log("no mirrored curriculum documents matched — nothing to restore.");
    log("(The mirror only contains files saved through the editor since it was enabled.)");
    return;
  }

  let written = 0;
  let skipped = 0;

  for (const doc of documents) {
    const target = safeTarget(doc.path);
    const serialised = JSON.stringify(doc.content, null, 2);

    // Leave byte-identical files alone so a rehydrate does not churn mtimes.
    if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === serialised) {
      skipped += 1;
      continue;
    }

    const tag = doc.deletedAt ? " (was deleted)" : "";
    log(`${fs.existsSync(target) ? "overwrite" : "create   "} ${doc.path}  v${doc.version}${tag}`);

    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, serialised);
    }
    written += 1;
  }

  log(
    `${DRY_RUN ? "would write" : "wrote"} ${written} file(s), ` +
      `${skipped} already up to date, ${documents.length} mirrored total.`
  );
}

main()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[curriculum-restore] FAILED:", err.message);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
