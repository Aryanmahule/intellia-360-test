/**
 * Shared helpers for the backup/restore/maintenance scripts.
 *
 * Deliberately dependency-free: these scripts run from cron, CI and recovery
 * shells where `npm install` may not have happened, or may be the very thing
 * that is broken. Everything here uses Node built-ins plus @prisma/client.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/* ── Environment ──────────────────────────────────────────────────────────── */

/**
 * Minimal .env loader.
 *
 * Credentials are never hardcoded in these scripts: DATABASE_URL and the
 * off-site storage keys come from the process environment (CI secrets, the
 * host's env) and fall back to a local .env file for developer machines.
 * Values already present in process.env always win.
 */
export function loadEnv(cwd = process.cwd()) {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;

    for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const eq = line.indexOf("=");
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

/** Fail loudly and early rather than producing a silently empty backup. */
export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Provide it in the environment or in .env / .env.local.`
    );
  }
  return value;
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

/** Timestamp safe for filenames, e.g. 2026-09-03T131500Z. */
export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "").replace(/(\d{3})Z$/, "Z");
}

export function humanBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

export function sha256File(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

/* ── Model discovery ──────────────────────────────────────────────────────── */

/**
 * Every model in the Prisma schema, read from the generated DMMF.
 *
 * Derived rather than hardcoded on purpose: a hand-maintained list is the
 * classic way a new collection ends up silently outside the backup.
 */
export function listModels(Prisma) {
  return Prisma.dmmf.datamodel.models.map((m) => ({
    name: m.name,
    // Prisma Client delegates are the model name with a lowercased first letter.
    delegate: m.name.charAt(0).toLowerCase() + m.name.slice(1),
    collection: m.dbName ?? m.name,
  }));
}

/* ── S3-compatible off-site upload (AWS SigV4, no SDK) ───────────────────── */

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * True when off-site backup storage is configured.
 *
 * A backup that only ever lands next to the database it came from does not
 * survive the failure modes backups exist for (host loss, ransomware, a
 * mistaken `rm -rf`), so the scripts warn loudly when this is unset.
 */
export function offsiteConfigured() {
  return Boolean(
    process.env.BACKUP_S3_BUCKET &&
      process.env.BACKUP_S3_ACCESS_KEY_ID &&
      process.env.BACKUP_S3_SECRET_ACCESS_KEY
  );
}

/**
 * PUT one object to any S3-compatible endpoint (AWS S3, Cloudflare R2,
 * Backblaze B2, MinIO, Wasabi) using a SigV4 signature built from Node crypto.
 *
 * Implemented directly rather than pulling in the AWS SDK so the recovery path
 * has no install step and no supply-chain surface.
 */
export async function uploadToS3(objectKey, body, contentType = "application/gzip") {
  const bucket = requireEnv("BACKUP_S3_BUCKET");
  const accessKey = requireEnv("BACKUP_S3_ACCESS_KEY_ID");
  const secretKey = requireEnv("BACKUP_S3_SECRET_ACCESS_KEY");
  const region = process.env.BACKUP_S3_REGION || "auto";
  // Endpoint host only, e.g. "s3.eu-west-1.amazonaws.com" or
  // "<account>.r2.cloudflarestorage.com".
  const endpoint = process.env.BACKUP_S3_ENDPOINT || `s3.${region}.amazonaws.com`;
  const prefix = (process.env.BACKUP_S3_PREFIX || "intellia360").replace(/^\/+|\/+$/g, "");

  const key = `${prefix}/${objectKey}`;
  const host = endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const canonicalUri = `/${bucket}/${key}`
    .split("/")
    .map((segment, i) => (i === 0 ? segment : encodeURIComponent(segment)))
    .join("/");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8")),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"),
    "aws4_request"
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Content-Type": contentType,
      "Content-Length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`S3 upload failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  return `s3://${bucket}/${key}`;
}
