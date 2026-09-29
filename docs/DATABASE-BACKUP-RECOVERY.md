# Intellia360 — Backup & Recovery Runbook

Everything in this document is executable. If you are here because something is
broken, jump to [Recovery scenarios](#recovery-scenarios).

> **Monorepo paths:** the database, the scripts and the curriculum store belong
> to the backend API in `apps/backend/`. Run every `node scripts/…` command
> below from `apps/backend/` (paths such as `src/data/grades`,
> `prisma/schema.prisma` and `backups/` are relative to it). The `npm run db:*`
> commands work from either the repository root or `apps/backend/`, and always
> execute inside `apps/backend/`.

---

## 1. What gets backed up

| Source | Captured by | Notes |
|---|---|---|
| Every MongoDB collection in `prisma/schema.prisma` | `scripts/backup.mjs` | The model list is read from the Prisma DMMF, so a new model is included automatically — no hand-maintained list to fall out of date. |
| Curriculum/lesson JSON (`src/data/grades`) | `curriculum_documents` + `curriculum_revisions` | These files live in the build artifact, not the database. Every editor save is mirrored into MongoDB, so the backup captures them and `restore-curriculum.mjs` writes them back to disk. |
| Reference/media metadata | `content_resources` | The platform stores external URLs, not file bytes — there is no object store to back up. |
| Backup history itself | `backup_runs` | One row per attempt: status, document counts, checksum, verification result. |

**Not backed up:** static assets under `public/`, and anything in `src/data`
that has never been touched by the editor (those files are in git — that *is*
their backup).

---

## 1a. First-time setup (run once)

```bash
# 1. Create the new collections and apply every index in the schema
npx prisma db push

# 2. Import the curriculum already on disk into the mirror.
#    Until this runs, the mirror is empty and the shipped lesson content is not
#    yet recoverable from the database — only files saved through the editor
#    get mirrored automatically.
node scripts/restore-curriculum.mjs --seed-mirror --dry-run   # preview
node scripts/restore-curriculum.mjs --seed-mirror

# 3. Take a first backup and confirm it verifies
npm run db:backup
```

> **Known gap:** 10 of the 12 `src/data/grades/*/dashboard.json` files are 0
> bytes in the repo (only `grade1` and `grade2` have content). The seeder skips
> them and reports each one. They are not data loss caused by any of this — they
> have simply never been populated.

---

## 2. Backup schedule

| | |
|---|---|
| **When** | 02:15 UTC daily |
| **Runs on** | GitHub Actions (`.github/workflows/database-backup.yml`) |
| **Why not on the app host** | The scheduler must survive the app host dying. A cron job on the same box that holds the database is not a backup strategy. |
| **Copies kept** | 14 local archives on the runner · off-site S3 objects (bucket lifecycle) · 30-day GitHub artifact |
| **Manual run** | Actions → *Database backup* → *Run workflow*, or `npm run db:backup` |

### Required secrets

Set these as repository secrets. Never in code, never in a committed `.env`.

```
DATABASE_URL                   MongoDB connection string
BACKUP_S3_BUCKET               Off-site bucket
BACKUP_S3_ACCESS_KEY_ID        Write-only key scoped to that bucket
BACKUP_S3_SECRET_ACCESS_KEY
BACKUP_S3_REGION               optional, default "auto"
BACKUP_S3_ENDPOINT             optional, e.g. <account>.r2.cloudflarestorage.com
BACKUP_S3_PREFIX               optional, default "intellia360"
```

Works with AWS S3, Cloudflare R2, Backblaze B2, Wasabi and MinIO. The upload is
signed with SigV4 built from Node's `crypto` — no AWS SDK, so the recovery path
has no install step and no extra supply-chain surface.

---

## 3. Protecting the backups themselves

Backups are a target. Three settings do most of the work, and they are set on
the **bucket**, not in this repo:

1. **Object Lock / immutability**, 35 days in compliance mode. An attacker
   holding the write key still cannot erase history.
2. **Versioning on.** An overwrite creates a new version instead of destroying
   the old one.
3. **Write-only credentials.** The CI key needs `PutObject` and nothing else.
   Use a separate, human-held, MFA-protected credential to read or delete.

Also worth having: a bucket lifecycle rule moving objects to cold storage after
30 days and expiring them at 365, and an alert on the workflow failing twice in
a row.

> The admin dashboard's *System Health* panel reads `backup_runs` and flags
> **Degraded** when the newest verified backup is more than 36 hours old, so a
> silently-stopped job surfaces the next morning rather than on recovery day.

---

## 4. Verification

Three independent layers, because an unverified backup is only a hope:

1. **Every run self-verifies.** `backup.mjs` reads its own archive back,
   decompresses it and re-counts every collection. A mismatch fails the job
   (exit 1) and writes `status: FAILED`.
2. **On demand:**
   ```bash
   npm run db:verify-backup -- --file backups/intellia360-<stamp>.ndjson.gz
   npm run db:verify-backup -- --file <archive> --compare-live   # show drift vs live
   ```
3. **Monthly restore drill** — see below. A backup you have never restored is
   an untested backup.

### Monthly restore drill

```bash
# 1. Point at a scratch database — NEVER production
export DATABASE_URL="mongodb+srv://…/intellia360_drill"

# 2. Create the collections and indexes
npx prisma db push

# 3. Restore the most recent archive
node scripts/restore.mjs --file backups/<newest>.ndjson.gz --mode replace --yes

# 4. Confirm the counts match the archive
node scripts/verify-backup.mjs --file backups/<newest>.ndjson.gz --compare-live

# 5. Point a local app at the drill database and log in as a seeded user
```

Record the date and the wall-clock time it took. That number is your real RTO.

---

## 5. Recovery scenarios

### A. One record deleted by mistake

Most deletions are **soft** by design, so this is usually not a restore at all:

| Entity | How to undo |
|---|---|
| User | `PATCH /api/admin/users/<id>` with `{"restore": true}` |
| Course | `PATCH /api/admin/courses/<id>` with `{"archived": false}` |
| School | `PATCH /api/admin/schools/<id>` with `{"archived": false}` |
| Content resource | `PATCH /api/admin/content/<id>` with `{"archived": false}` |

Find them with `GET /api/admin/users?includeDeleted=true` (and
`?includeArchived=true` on the others).

Permanent deletion requires the record to be archived *first* and then an
explicit `?permanent=true`, so it cannot happen on a single mis-click.

### B. A lesson was overwritten or a grade deleted in the editor

The filesystem is not the source of truth — `curriculum_documents` is.

```bash
# See what the mirror holds without writing anything
node scripts/restore-curriculum.mjs --dry-run

# Restore one deleted grade, tombstones included
node scripts/restore-curriculum.mjs --grade grade3 --include-deleted

# Roll one file back to an earlier version
node scripts/restore-curriculum.mjs \
  --path grade1/lessons/ordinal-numbers.json --version 3
```

### C. Content vanished after a deploy

Expected on an immutable host: the deploy replaced `src/data/grades` with the
build's copy. Rehydrate from the mirror:

```bash
node scripts/restore-curriculum.mjs
```

Consider adding this to the post-deploy step so it happens automatically.

### D. Full database loss

```bash
# 1. Provision a new MongoDB cluster and set DATABASE_URL

# 2. Create collections and indexes
npx prisma db push

# 3. Fetch the newest off-site archive (example: AWS CLI)
aws s3 cp s3://$BACKUP_S3_BUCKET/intellia360/<newest>.ndjson.gz .

# 4. Check it before trusting it
node scripts/verify-backup.mjs --file <newest>.ndjson.gz

# 5. Dry run — read the plan carefully, confirm the target database
node scripts/restore.mjs --file <newest>.ndjson.gz --mode replace --dry-run

# 6. Restore
node scripts/restore.mjs --file <newest>.ndjson.gz --mode replace

# 7. Put curriculum files back on disk
node scripts/restore-curriculum.mjs

# 8. Post-restore checks — see the checklist below
```

### E. Partial corruption of one collection

```bash
node scripts/restore.mjs --file <archive> --models QuizAttempt,CompletedLesson --mode replace
```

`--mode merge` (the default) upserts and leaves everything else alone; it is
idempotent and safe to re-run after a partial failure.

---

## 6. Post-restore checklist

- [ ] `node scripts/verify-backup.mjs --file <archive> --compare-live` — drift is 0 for restored models
- [ ] Admin can log in; *System Health* shows Database **Operational**
- [ ] A student account shows the expected XP, gems, streak and completed lessons
- [ ] `/student/leaderboard` renders and is ordered correctly
- [ ] A lesson page loads its JSON (confirms the curriculum rehydrate worked)
- [ ] `GET /api/admin/audit?limit=5` returns the pre-incident trail
- [ ] Trigger one manual backup of the recovered database before reopening to users

---

## 7. Objectives

| | Target | Determined by |
|---|---|---|
| **RPO** (max data loss) | 24 hours | Nightly schedule. Tighten by adding a second `cron` entry. |
| **RTO** (time to restore) | < 1 hour | Measure it in the monthly drill and update this number. |

---

## 8. Routine maintenance

`scripts/db-maintenance.mjs` runs nightly after the backup and prunes only
operational exhaust — expired tokens, stale rate-limit windows, old curriculum
revisions beyond the newest 20 per file, audit entries past retention. Learner,
teacher, school, course and financial data are never touched.

```bash
npm run db:maintenance -- --dry-run   # always safe: counts, deletes nothing
npm run db:maintenance
```

Every window is an environment variable (`AUDIT_RETENTION_DAYS`,
`TOKEN_RETENTION_DAYS`, …) — see `.env.example`.

---

## 9. Command reference

```bash
npm run db:backup                 # manual backup (local + off-site if configured)
npm run db:verify-backup -- --file <archive>
npm run db:restore -- --file <archive> --dry-run
npm run db:restore-curriculum     # rehydrate src/data/grades from the mirror
npm run db:maintenance -- --dry-run
npm run db:indexes                # prisma db push — apply schema + indexes
```
