#!/usr/bin/env node
/**
 * Intellia360 — local environment setup helper
 *
 * Copies .env.example templates to their working locations and validates that
 * every required variable is set before you attempt a local build or deploy.
 *
 * Usage:
 *   node scripts/setup-env.mjs          # copy templates + validate
 *   node scripts/setup-env.mjs --check  # validate only (no file copies)
 *
 * Safe to re-run: existing .env files are never overwritten.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Colour helpers ─────────────────────────────────────────────────────────
const c = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const log   = (msg) => console.log(`${c.green("✔")} ${msg}`);
const warn  = (msg) => console.warn(`${c.yellow("⚠")} ${msg}`);
const error = (msg) => console.error(`${c.red("✖")} ${msg}`);
const info  = (msg) => console.log(`${c.cyan("ℹ")} ${msg}`);

// ── Template → destination pairs ──────────────────────────────────────────
const ENV_FILES = [
  {
    src:  "apps/backend/.env.example",
    dest: "apps/backend/.env",
    label: "Backend API",
  },
  {
    src:  "apps/frontend/.env.example",
    dest: "apps/frontend/.env.local",
    label: "Frontend",
  },
];

// ── Required variables (must be non-empty, non-placeholder) ───────────────
// Values matching these patterns are treated as "not set".
const PLACEHOLDER_RE = /^(CHANGE|change|xxx|your|placeholder|example|gsk_xxx|re_xxx|0{6})/i;

const REQUIRED = {
  "apps/backend/.env": [
    {
      key: "DATABASE_URL",
      desc: "MongoDB connection string",
      hint: "mongodb+srv://user:password@cluster.mongodb.net/intellia360",
      check: (v) => v.startsWith("mongodb"),
    },
    {
      key: "AUTH_JWT_SECRET",
      desc: "JWT signing secret (≥ 64 chars)",
      hint: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`,
      check: (v) => v.length >= 32,
      autofix: () => crypto.randomBytes(64).toString("base64"),
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      desc: "Frontend public URL",
      hint: "http://localhost:3000 (dev) or https://yourdomain.com (prod)",
      check: (v) => v.startsWith("http"),
    },
    {
      key: "FRONTEND_URL",
      desc: "Frontend URL (used in email links)",
      hint: "Same as NEXT_PUBLIC_APP_URL",
      check: (v) => v.startsWith("http"),
    },
    {
      key: "CORS_ORIGIN",
      desc: "Allowed CORS origins",
      hint: "http://localhost:3000",
      check: (v) => v.startsWith("http"),
    },
  ],
  "apps/frontend/.env.local": [
    {
      key: "NEXT_PUBLIC_API_URL",
      desc: "Backend API URL",
      hint: "http://localhost:4000 (dev) or https://api.yourdomain.com (prod)",
      check: (v) => v.startsWith("http"),
    },
  ],
};

// ── Optional variables worth flagging if unset ─────────────────────────────
const OPTIONAL_NOTICE = {
  "apps/backend/.env": [
    { key: "GROQ_API_KEY",    desc: "AI tutor (Groq)" },
    { key: "RESEND_API_KEY",  desc: "Email (Resend)" },
    { key: "GOOGLE_CLIENT_ID",desc: "Google sign-in" },
    { key: "ADMIN_PASSWORD",  desc: "Platform admin password (needed for first seed)" },
  ],
};

// ── Parse a .env file into a key→value map ─────────────────────────────────
function parseEnv(filePath) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) return null;
  const map = {};
  for (const raw of fs.readFileSync(abs, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    map[key] = val;
  }
  return map;
}

// ── Copy template if destination does not exist ────────────────────────────
function copyTemplate({ src, dest, label }) {
  const absSrc  = path.resolve(ROOT, src);
  const absDest = path.resolve(ROOT, dest);

  if (!fs.existsSync(absSrc)) {
    warn(`Template not found: ${src}`);
    return false;
  }

  if (fs.existsSync(absDest)) {
    info(`${label}: ${dest} already exists — skipping copy`);
    return true;
  }

  fs.copyFileSync(absSrc, absDest);
  log(`${label}: created ${dest} from ${src}`);
  return true;
}

// ── Validate one env file ──────────────────────────────────────────────────
function validateEnv(filePath) {
  const map = parseEnv(filePath);
  if (!map) {
    error(`${filePath} does not exist. Run without --check to create it.`);
    return false;
  }

  const rules   = REQUIRED[filePath] ?? [];
  const notices = OPTIONAL_NOTICE[filePath] ?? [];
  let ok = true;

  console.log(`\n${c.bold(filePath)}`);

  for (const rule of rules) {
    const val = map[rule.key] ?? "";
    const isPlaceholder = PLACEHOLDER_RE.test(val);
    const passesCheck   = rule.check ? rule.check(val) : val.length > 0;

    if (!val || isPlaceholder || !passesCheck) {
      // Auto-fix if possible (e.g. generate JWT secret)
      if (rule.autofix && (!val || isPlaceholder)) {
        const generated = rule.autofix();
        warn(`  ${rule.key}: placeholder detected — suggested value generated below`);
        info(`    Add to ${filePath}:`);
        console.log(`    ${rule.key}=${generated}`);
      } else {
        error(`  ${rule.key} — ${rule.desc}`);
        info(`    Hint: ${rule.hint}`);
      }
      ok = false;
    } else {
      log(`  ${rule.key}`);
    }
  }

  for (const { key, desc } of notices) {
    const val = map[key] ?? "";
    if (!val || PLACEHOLDER_RE.test(val)) {
      warn(`  ${key} not set — ${desc} will be unavailable`);
    }
  }

  return ok;
}

// ── Main ───────────────────────────────────────────────────────────────────
const checkOnly = process.argv.includes("--check");

console.log(c.bold("\nIntelli360 environment setup\n"));

if (!checkOnly) {
  console.log("Copying templates...\n");
  for (const pair of ENV_FILES) {
    copyTemplate(pair);
  }
}

console.log("\nValidating environment files...");

let allOk = true;
for (const { dest } of ENV_FILES) {
  const ok = validateEnv(dest);
  if (!ok) allOk = false;
}

console.log("");
if (allOk) {
  log("All required variables are set.");
  console.log("");
  info("Next steps:");
  console.log("  npm run prisma:generate");
  console.log("  npm run build");
  console.log("");
} else {
  error("One or more required variables are missing or still hold placeholder values.");
  console.log("");
  info("Edit the files shown above, then re-run:");
  console.log("  node scripts/setup-env.mjs --check");
  console.log("");
  process.exit(1);
}
