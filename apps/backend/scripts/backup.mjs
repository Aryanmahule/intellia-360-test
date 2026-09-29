/**
 * Intellia360 — database backup
 *
 *   node scripts/backup.mjs [--trigger scheduled|manual] [--out <dir>] [--keep <n>]
 *
 * What it does
 * ────────────
 *  1. Streams every collection in the Prisma schema to newline-delimited JSON.
 *  2. Includes the curriculum mirror, so the filesystem-backed lesson content
 *     that lives outside the database is captured too.
 *  3. Gzips the result into one archive and checksums it.
 *  4. VERIFIES the archive by reading it back, decompressing it and re-counting
 *     every document — an unverified backup is only a hope.
 *  5. Uploads a copy off-site when S3-compatible storage is configured.
 *  6. Prunes old local archives down to the retention count.
 *  7. Records the outcome in the BackupRun collection so "did last night's
 *     backup work?" is answerable from the admin dashboard.
 *
 * Exit codes: 0 success, 1 failure (so cron/CI marks the job red).
 *
 * Credentials come from the environment only — see .env.example.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { createRequire } from "node:module";
import {
  loadEnv,
  requireEnv,
  timestampSlug,
  humanBytes,
  sha256File,
  listModels,
  offsiteConfigured,
  uploadToS3,
} from "./lib/backup-common.mjs";

const require = createRequire(import.meta.url);
loadEnv();
requireEnv("DATABASE_URL");

const { PrismaClient, Prisma } = require("@prisma/client");

/* ── Arguments ────────────────────────────────────────────────────────────── */

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const TRIGGER = arg("--trigger", "manual");
const OUT_DIR = path.resolve(arg("--out", process.env.BACKUP_DIR || "backups"));
const KEEP = Math.max(1, parseInt(arg("--keep", process.env.BACKUP_KEEP || "14"), 10));
/** Rows read per query — bounded so a large collection never has to fit in RAM. */
const PAGE_SIZE = 500;

const db = new PrismaClient({ log: ["error"] });

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function log(...parts) {
  console.log(`[backup] ${parts.join(" ")}`);
}

/**
 * JSON.stringify replacer that keeps types a restore can round-trip.
 * Dates become tagged objects; BigInt would otherwise throw outright.
 */
function replacer(_key, value) {
  if (value instanceof Date) return { __type: "Date", value: value.toISOString() };
  if (typeof value === "bigint") return { __type: "BigInt", value: value.toString() };
  return value;
}

/** Page through one model with a stable cursor so nothing is skipped or doubled. */
async function* readModel(delegate) {
  let cursor;
  for (;;) {
    const batch = await db[delegate].findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) return;
    for (const row of batch) yield row;
    if (batch.length < PAGE_SIZE) return;
    cursor = batch[batch.length - 1].id;
  }
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  const startedAt = new Date();
  const stamp = timestampSlug(startedAt);
  const archivePath = path.join(OUT_DIR, `intellia360-${stamp}.ndjson.gz`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Register the attempt up-front so a crashed run leaves a RUNNING row behind
  // rather than no evidence that a backup was ever tried.
  let runId = null;
  try {
    const run = await db.backupRun.create({
      data: {
        startedAt,
        status: "RUNNING",
        trigger: TRIGGER,
        destination: offsiteConfigured() ? "local+s3" : "local",
        artifactPath: archivePath,
      },
      select: { id: true },
    });
    runId = run.id;
  } catch (err) {
    console.warn("[backup] could not record BackupRun (continuing):", err.message);
  }

  const models = listModels(Prisma);
  const counts = {};
  let documentCount = 0;

  const gzip = zlib.createGzip({ level: 9 });
  const out = fs.createWriteStream(archivePath);
  const done = new Promise((resolve, reject) => {
    out.on("finish", resolve);
    out.on("error", reject);
    gzip.on("error", reject);
  });
  gzip.pipe(out);

  /** Backpressure-aware write — a large collection must not balloon memory. */
  const write = (line) =>
    new Promise((resolve, reject) => {
      if (gzip.write(line)) return resolve();
      gzip.once("drain", resolve);
      gzip.once("error", reject);
    });

  await write(
    JSON.stringify({
      __meta: {
        format: "intellia360-ndjson-v1",
        createdAt: startedAt.toISOString(),
        trigger: TRIGGER,
        models: models.map((m) => m.name),
      },
    }) + "\n"
  );

  log(`writing ${models.length} collections to ${archivePath}`);

  for (const model of models) {
    let n = 0;
    for await (const row of readModel(model.delegate)) {
      await write(JSON.stringify({ model: model.name, data: row }, replacer) + "\n");
      n += 1;
    }
    counts[model.name] = n;
    documentCount += n;
    log(`  ${model.name.padEnd(24)} ${String(n).padStart(7)} document(s)`);
  }

  gzip.end();
  await done;

  const sizeBytes = fs.statSync(archivePath).size;
  const checksum = sha256File(archivePath);
  log(`archive ${humanBytes(sizeBytes)}  sha256=${checksum.slice(0, 16)}…`);

  /* ── Verify: read the archive back and re-count ─────────────────────────── */
  log("verifying archive…");
  const verifiedCounts = {};
  let verifiedTotal = 0;

  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(archivePath).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });
    rl.on("line", (line) => {
      if (!line) return;
      try {
        const parsed = JSON.parse(line);
        if (parsed.__meta) return;
        verifiedCounts[parsed.model] = (verifiedCounts[parsed.model] ?? 0) + 1;
        verifiedTotal += 1;
      } catch (err) {
        reject(new Error(`archive contains an unparseable line: ${err.message}`));
      }
    });
    rl.on("close", resolve);
    rl.on("error", reject);
  });

  if (verifiedTotal !== documentCount) {
    throw new Error(
      `verification failed: wrote ${documentCount} documents but read back ${verifiedTotal}`
    );
  }
  for (const [model, n] of Object.entries(counts)) {
    if ((verifiedCounts[model] ?? 0) !== n) {
      throw new Error(
        `verification failed for ${model}: wrote ${n}, read back ${verifiedCounts[model] ?? 0}`
      );
    }
  }
  log(`verified ${verifiedTotal} document(s) across ${Object.keys(counts).length} collections`);

  /* ── Off-site copy ──────────────────────────────────────────────────────── */
  let destination = "local";
  if (offsiteConfigured()) {
    log("uploading off-site copy…");
    const uri = await uploadToS3(path.basename(archivePath), fs.readFileSync(archivePath));
    destination = "local+s3";
    log(`uploaded to ${uri}`);
  } else {
    console.warn(
      "[backup] WARNING: no off-site storage configured (BACKUP_S3_*). " +
        "This archive lives only on the machine that produced it, which does not " +
        "protect against host loss. See docs/DATABASE-BACKUP-RECOVERY.md."
    );
  }

  /* ── Retention ──────────────────────────────────────────────────────────── */
  const archives = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.startsWith("intellia360-") && f.endsWith(".ndjson.gz"))
    .sort()
    .reverse();

  for (const stale of archives.slice(KEEP)) {
    fs.unlinkSync(path.join(OUT_DIR, stale));
    log(`pruned old archive ${stale}`);
  }
  log(`retaining ${Math.min(archives.length, KEEP)} of ${archives.length} local archive(s)`);

  /* ── Record success ─────────────────────────────────────────────────────── */
  if (runId) {
    await db.backupRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        status: "SUCCESS",
        destination,
        collections: counts,
        documentCount,
        sizeBytes,
        checksum,
        verified: true,
        artifactPath: archivePath,
      },
    });
  }

  log(`done in ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s`);
  return { runId };
}

let runIdForFailure = null;
main()
  .then(({ runId }) => {
    runIdForFailure = runId;
    return db.$disconnect();
  })
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[backup] FAILED:", err.message);
    try {
      if (runIdForFailure) {
        await db.backupRun.update({
          where: { id: runIdForFailure },
          data: {
            finishedAt: new Date(),
            status: "FAILED",
            error: String(err.message).slice(0, 1000),
          },
        });
      } else {
        await db.backupRun.create({
          data: {
            status: "FAILED",
            trigger: TRIGGER,
            destination: "none",
            finishedAt: new Date(),
            error: String(err.message).slice(0, 1000),
          },
        });
      }
    } catch {
      // The database being unreachable is itself a plausible failure cause.
    }
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
