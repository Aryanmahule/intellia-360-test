/**
 * Intellia360 — routine database maintenance
 *
 *   node scripts/db-maintenance.mjs [--dry-run]
 *
 * Removes rows that are pure operational exhaust and that otherwise grow
 * without bound — the main driver of storage cost on a hosted MongoDB plan.
 * Nothing here touches learner, teacher, school, course or financial data.
 *
 * What it prunes
 * ──────────────
 *   rate_limit_records         windows older than RATE_LIMIT_RETENTION_HOURS (24h)
 *   email_verification_tokens  used or expired, older than TOKEN_RETENTION_DAYS (7d)
 *   password_reset_tokens      used or expired, older than TOKEN_RETENTION_DAYS (7d)
 *   curriculum_revisions       all but the newest CURRICULUM_REVISIONS_KEPT (20) per file
 *   audit_logs                 older than AUDIT_RETENTION_DAYS (730d — 2 years)
 *   backup_runs                older than BACKUP_RUN_RETENTION_DAYS (365d)
 *
 * Every window is an environment variable, so retention can be tightened or
 * loosened without editing code. Run it nightly, after the backup — so anything
 * it removes is already captured in that night's archive.
 */
import { createRequire } from "node:module";
import { loadEnv, requireEnv } from "./lib/backup-common.mjs";

const require = createRequire(import.meta.url);
loadEnv();
requireEnv("DATABASE_URL");

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: ["error"] });

const DRY_RUN = process.argv.includes("--dry-run");
const log = (...p) => console.log(`[maintenance] ${p.join(" ")}`);

const num = (name, fallback) => {
  const parsed = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_HOURS = num("RATE_LIMIT_RETENTION_HOURS", 24);
const TOKEN_DAYS = num("TOKEN_RETENTION_DAYS", 7);
const AUDIT_DAYS = num("AUDIT_RETENTION_DAYS", 730);
const BACKUP_RUN_DAYS = num("BACKUP_RUN_RETENTION_DAYS", 365);
const REVISIONS_KEPT = num("CURRICULUM_REVISIONS_KEPT", 20);

const ago = (ms) => new Date(Date.now() - ms);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Count first, delete second — so --dry-run reports the real blast radius. */
async function prune(label, delegate, where) {
  const count = await db[delegate].count({ where });
  if (count === 0) {
    log(`${label.padEnd(26)} nothing to prune`);
    return 0;
  }
  if (DRY_RUN) {
    log(`${label.padEnd(26)} would delete ${count}`);
    return count;
  }
  const result = await db[delegate].deleteMany({ where });
  log(`${label.padEnd(26)} deleted ${result.count}`);
  return result.count;
}

/**
 * Trim curriculum revision history per document.
 *
 * Revisions are the undo history behind an editor save, so this keeps the most
 * recent N for every file and only drops what is older than that — the current
 * version itself lives on CurriculumDocument and is never touched here.
 */
async function pruneRevisions() {
  const documents = await db.curriculumDocument.findMany({ select: { id: true, path: true } });
  let total = 0;

  for (const doc of documents) {
    const revisions = await db.curriculumRevision.findMany({
      where: { documentId: doc.id },
      select: { id: true },
      orderBy: { version: "desc" },
      skip: REVISIONS_KEPT,
    });
    if (revisions.length === 0) continue;

    if (DRY_RUN) {
      log(`  ${doc.path}: would drop ${revisions.length} old revision(s)`);
    } else {
      await db.curriculumRevision.deleteMany({
        where: { id: { in: revisions.map((r) => r.id) } },
      });
    }
    total += revisions.length;
  }

  log(
    `${"curriculum_revisions".padEnd(26)} ${DRY_RUN ? "would delete" : "deleted"} ${total} ` +
      `(keeping newest ${REVISIONS_KEPT} per file)`
  );
  return total;
}

async function main() {
  log(DRY_RUN ? "dry run — nothing will be deleted" : "pruning…");

  const now = new Date();
  let total = 0;

  // Rate-limit windows are only meaningful for the length of the window itself.
  total += await prune("rate_limit_records", "rateLimitRecord", {
    windowStart: { lt: ago(RATE_LIMIT_HOURS * HOUR) },
  });

  // Spent or expired tokens can never be redeemed again.
  const tokenWhere = {
    AND: [
      { OR: [{ used: true }, { expiresAt: { lt: now } }] },
      { createdAt: { lt: ago(TOKEN_DAYS * DAY) } },
    ],
  };
  total += await prune("email_verification_tokens", "emailVerificationToken", tokenWhere);
  total += await prune("password_reset_tokens", "passwordResetToken", tokenWhere);

  total += await pruneRevisions();

  // Audit retention is deliberately long — this is the compliance record.
  total += await prune("audit_logs", "auditLog", {
    createdAt: { lt: ago(AUDIT_DAYS * DAY) },
  });

  total += await prune("backup_runs", "backupRun", {
    startedAt: { lt: ago(BACKUP_RUN_DAYS * DAY) },
  });

  log(`${DRY_RUN ? "would remove" : "removed"} ${total} row(s) in total.`);
}

main()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[maintenance] FAILED:", err.message);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
