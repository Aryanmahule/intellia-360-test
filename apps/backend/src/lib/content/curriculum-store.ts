/**
 * Durable mirror for the filesystem-backed curriculum store.
 *
 * The editor module writes lesson/curriculum JSON into `src/data/grades`. That
 * directory is part of the build artifact, which means on any immutable or
 * serverless host (Vercel, containers, an autoscaling group) an editor's saved
 * work is discarded at the next deploy — and it is never captured by a database
 * backup, because it never reaches the database.
 *
 * Rather than rewrite the read path (every student route reads these files
 * synchronously), each write is mirrored into MongoDB:
 *
 *   file write  -> CurriculumDocument (current version, unique on `path`)
 *   overwrite   -> previous content copied into CurriculumRevision first
 *   file delete -> tombstone (`deletedAt` set), content retained
 *
 * The database therefore holds the recoverable source of truth, and
 * `scripts/restore-curriculum.mjs` can rehydrate the filesystem after a deploy
 * or an accidental overwrite.
 *
 * Mirroring is best-effort: a mirror failure logs but does not fail the editor's
 * save, so a briefly unreachable database cannot block content work.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { notDeleted } from "@/lib/db-filters";

export const CURRICULUM_ROOT = path.join(process.cwd(), "src", "data", "grades");

/* ── Path safety ──────────────────────────────────────────────────────────── */

/** Grade ids are always grade<number> — anything else is rejected outright. */
const GRADE_ID_RE = /^grade\d{1,2}$/;
/** Lesson ids are slugs; no dots, no separators, so they cannot escape the dir. */
const LESSON_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafePathError";
  }
}

/**
 * Validate a grade id taken from a route param.
 *
 * These ids are interpolated straight into filesystem paths, so an unchecked
 * value such as "../../.." turns a curriculum save into an arbitrary file write
 * and a grade delete into a recursive delete of an arbitrary directory.
 */
export function assertGradeId(gradeId: string): string {
  const id = (gradeId ?? "").trim().toLowerCase();
  if (!GRADE_ID_RE.test(id)) {
    throw new UnsafePathError(
      `Invalid gradeId "${gradeId}" — expected grade<number>, e.g. grade8`
    );
  }
  return id;
}

/** Validate a lesson id from a route param. Same rationale as assertGradeId. */
export function assertLessonId(lessonId: string): string {
  const id = (lessonId ?? "").trim().toLowerCase();
  if (!LESSON_ID_RE.test(id) || id.length > 128) {
    throw new UnsafePathError(`Invalid lessonId "${lessonId}" — expected a lowercase slug`);
  }
  return id;
}

/**
 * Resolve a store-relative path to an absolute one, asserting the result is
 * still inside CURRICULUM_ROOT. Belt-and-braces behind the id validators: even
 * if a future caller forgets to validate, traversal cannot leave the store.
 */
export function resolveInStore(...segments: string[]): string {
  const root = path.resolve(CURRICULUM_ROOT);
  const abs = path.resolve(root, ...segments);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new UnsafePathError("Resolved path escapes the curriculum store");
  }
  return abs;
}

/** Store-relative POSIX path used as the CurriculumDocument key. */
export function storePath(...segments: string[]): string {
  return segments.join("/");
}

/* ── Mirroring ────────────────────────────────────────────────────────────── */

export type CurriculumKind = "curriculum" | "dashboard" | "lesson";

function checksum(content: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export interface MirrorArgs {
  path: string;
  gradeId: string;
  kind: CurriculumKind;
  lessonId?: string | null;
  content: unknown;
  updatedBy?: string | null;
}

/**
 * Upsert the current version of one curriculum file and archive the version it
 * replaced. Returns the new version number, or null when the mirror failed.
 *
 * The read-then-write runs in a transaction so two concurrent saves cannot
 * interleave and produce two revisions claiming the same version number.
 */
export async function mirrorCurriculumWrite(args: MirrorArgs): Promise<number | null> {
  const sum = checksum(args.content);

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.curriculumDocument.findUnique({
        where: { path: args.path },
        select: {
          id: true,
          version: true,
          content: true,
          checksum: true,
          updatedBy: true,
          deletedAt: true,
        },
      });

      // Identical content — record nothing rather than inflating the history
      // with a no-op revision every time the editor re-saves an unchanged file.
      if (existing && existing.checksum === sum && existing.deletedAt === null) {
        return existing.version;
      }

      if (!existing) {
        const created = await tx.curriculumDocument.create({
          data: {
            path: args.path,
            gradeId: args.gradeId,
            kind: args.kind,
            lessonId: args.lessonId ?? null,
            content: args.content as never,
            checksum: sum,
            version: 1,
            updatedBy: args.updatedBy ?? null,
          },
          select: { version: true },
        });
        return created.version;
      }

      // Keep the outgoing version before overwriting it.
      await tx.curriculumRevision.create({
        data: {
          documentId: existing.id,
          version: existing.version,
          content: existing.content as never,
          checksum: existing.checksum,
          updatedBy: existing.updatedBy,
        },
      });

      const updated = await tx.curriculumDocument.update({
        where: { id: existing.id },
        data: {
          content: args.content as never,
          checksum: sum,
          version: existing.version + 1,
          kind: args.kind,
          gradeId: args.gradeId,
          lessonId: args.lessonId ?? null,
          updatedBy: args.updatedBy ?? null,
          deletedAt: null, // a re-save resurrects a tombstoned file
        },
        select: { version: true },
      });
      return updated.version;
    });
  } catch (err) {
    console.error("[curriculum-store] mirror write failed for", args.path, err);
    return null;
  }
}

/**
 * Tombstone mirrored files. Content is deliberately retained so a deletion made
 * in the editor can still be undone from the database.
 */
export async function mirrorCurriculumDelete(
  paths: string[],
  updatedBy?: string | null
): Promise<boolean> {
  if (paths.length === 0) return true;
  try {
    await db.curriculumDocument.updateMany({
      where: { path: { in: paths }, AND: [notDeleted()] },
      data: { deletedAt: new Date(), updatedBy: updatedBy ?? null },
    });
    return true;
  } catch (err) {
    console.error("[curriculum-store] mirror delete failed", err);
    return false;
  }
}

/* ── Read-only hosts ──────────────────────────────────────────────────────── */

let storeWritable: boolean | null = null;

/**
 * Whether curriculum files can be written on this host. Probed once per process.
 *
 * Locally they can, and the files stay the source of truth. On a read-only
 * deployment (Vercel mounts the build output read-only) every write throws
 * EROFS, so there the mirrored database copy has to act as the store.
 */
export function isStoreWritable(): boolean {
  if (storeWritable === null) {
    try {
      fs.accessSync(CURRICULUM_ROOT, fs.constants.W_OK);
      storeWritable = true;
    } catch {
      storeWritable = false;
    }
  }
  return storeWritable;
}

/** Called when a write is refused even though the probe said the store was writable. */
export function markStoreReadOnly(): void {
  storeWritable = false;
}

/**
 * The mirrored copy of one file, tombstones included. Null when the file was
 * never mirrored or the database could not be reached.
 */
export async function findMirroredDocument(relPath: string) {
  try {
    return await db.curriculumDocument.findUnique({
      where: { path: relPath },
      select: { path: true, lessonId: true, content: true, deletedAt: true, version: true },
    });
  } catch (err) {
    console.error("[curriculum-store] mirror read failed for", relPath, err);
    return null;
  }
}

/** Every mirrored document for a grade (optionally of one kind), tombstones included. */
export async function listMirroredDocuments(gradeId: string, kind?: CurriculumKind) {
  try {
    return await db.curriculumDocument.findMany({
      where: { gradeId, ...(kind ? { kind } : {}) },
      select: { path: true, lessonId: true, content: true, deletedAt: true, version: true },
    });
  } catch (err) {
    console.error("[curriculum-store] mirror list failed for", gradeId, kind, err);
    return [];
  }
}

/** The grade of every mirrored curriculum.json, tombstones included. */
export async function listMirroredCurricula(): Promise<{ gradeId: string; deletedAt: Date | null }[]> {
  try {
    return await db.curriculumDocument.findMany({
      where: { kind: "curriculum" },
      select: { gradeId: true, deletedAt: true },
    });
  } catch (err) {
    console.error("[curriculum-store] mirror curriculum list failed", err);
    return [];
  }
}

/* ── Documents: the file where writable, the mirror where not ─────────────── */

/** A store failure the API should report with this HTTP status and message. */
export class StoreError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "StoreError";
  }
}

/** Codes meaning "this host will not let us write here", as opposed to a transient fault. */
const READ_ONLY_CODES = new Set(["EROFS", "EACCES", "EPERM"]);

function errorCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException | null)?.code;
}

export function isReadOnlyError(err: unknown): boolean {
  const code = errorCode(err);
  return !!code && READ_ONLY_CODES.has(code);
}

/**
 * The current content of a store file, or null when it does not exist or was
 * deleted. On a read-only host the mirrored copy wins over the file that
 * shipped with the build, and a tombstone hides that file.
 */
export async function readStoreDocument(relPath: string): Promise<unknown | null> {
  if (!isStoreWritable()) {
    const doc = await findMirroredDocument(relPath);
    if (doc) return doc.deletedAt ? null : doc.content;
  }

  const fp = resolveInStore(...relPath.split("/"));
  if (!fs.existsSync(fp)) return null;

  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as unknown;
  } catch (err) {
    console.error("[curriculum-store] could not read", relPath, err);
    throw new StoreError(
      err instanceof SyntaxError
        ? `${relPath} is not valid JSON.`
        : `Could not read ${relPath} (${errorCode(err) ?? "unknown error"}).`,
      500
    );
  }
}

/** Whether a store file exists — same precedence as readStoreDocument, without parsing it. */
export async function storeDocumentExists(relPath: string): Promise<boolean> {
  if (!isStoreWritable()) {
    const doc = await findMirroredDocument(relPath);
    if (doc) return !doc.deletedAt;
  }
  return fs.existsSync(resolveInStore(...relPath.split("/")));
}

/** Whether a grade exists: its directory where files are writable, its live curriculum where not. */
export async function storeGradeExists(gradeId: string): Promise<boolean> {
  if (isStoreWritable()) return fs.existsSync(resolveInStore(gradeId));
  return storeDocumentExists(storePath(gradeId, "curriculum.json"));
}

export interface StoredDocument {
  version: number | null;
  /** "database" when this host could not write the file and only the mirror holds the change. */
  storedIn: "file" | "database";
}

/**
 * Writes a store file and mirrors it. `label` names the document in error
 * messages ("lesson", "curriculum"). Throws StoreError when nothing durable
 * accepted the write.
 */
export async function writeStoreDocument(args: MirrorArgs, label: string): Promise<StoredDocument> {
  let wroteFile = false;

  if (isStoreWritable()) {
    const fp = resolveInStore(...args.path.split("/"));
    try {
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, JSON.stringify(args.content, null, 2));
      wroteFile = true;
    } catch (err) {
      if (!isReadOnlyError(err)) {
        console.error("[curriculum-store] could not write", args.path, err);
        throw new StoreError(`Could not write the ${label} file (${errorCode(err) ?? "unknown error"}).`, 500);
      }
      // Refused despite the probe — treat the host as read-only from now on.
      markStoreReadOnly();
    }
  }

  const version = await mirrorCurriculumWrite(args);

  if (!wroteFile && version === null) {
    throw new StoreError(
      `The ${label} was not saved: this server cannot write curriculum files and the database could not be reached. Try again in a moment.`,
      503
    );
  }

  return { version, storedIn: wroteFile ? "file" : "database" };
}

/**
 * Deletes store files. Each is snapshotted into the mirror first, so every
 * tombstone carries recoverable content. Where files are writable they are
 * removed; on a read-only host the shipped files stay and the tombstones are
 * what hide them, so there the mirror must succeed.
 */
export async function deleteStoreDocuments(documents: MirrorArgs[], label: string): Promise<void> {
  if (documents.length === 0) return;

  let snapshotted = true;
  for (const doc of documents) {
    if ((await mirrorCurriculumWrite(doc)) === null) snapshotted = false;
  }

  const paths = documents.map((doc) => doc.path);
  const updatedBy = documents[0].updatedBy ?? null;

  if (isStoreWritable()) {
    try {
      for (const relPath of paths) {
        const fp = resolveInStore(...relPath.split("/"));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      await mirrorCurriculumDelete(paths, updatedBy);
      return;
    } catch (err) {
      if (!isReadOnlyError(err)) {
        console.error("[curriculum-store] could not delete", paths, err);
        throw new StoreError(`Could not delete the ${label} file (${errorCode(err) ?? "unknown error"}).`, 500);
      }
      markStoreReadOnly();
    }
  }

  if (!snapshotted || !(await mirrorCurriculumDelete(paths, updatedBy))) {
    throw new StoreError(
      `The ${label} was not deleted: the database could not be reached. Try again in a moment.`,
      503
    );
  }
}

/** Every store-relative file path currently present under a grade directory. */
export function listGradeFiles(gradeId: string): string[] {
  const gradeDir = resolveInStore(gradeId);
  if (!fs.existsSync(gradeDir)) return [];

  const out: string[] = [];
  for (const name of ["curriculum.json", "dashboard.json"]) {
    if (fs.existsSync(path.join(gradeDir, name))) out.push(storePath(gradeId, name));
  }

  const lessonsDir = path.join(gradeDir, "lessons");
  if (fs.existsSync(lessonsDir)) {
    for (const f of fs.readdirSync(lessonsDir)) {
      if (f.endsWith(".json")) out.push(storePath(gradeId, "lessons", f));
    }
  }
  return out;
}

/** Classify a store-relative path into the kind/lessonId the mirror records. */
export function classifyPath(relPath: string): {
  kind: CurriculumKind;
  lessonId: string | null;
} {
  const parts = relPath.split("/");
  if (parts[1] === "lessons") {
    return { kind: "lesson", lessonId: (parts[2] ?? "").replace(/\.json$/, "") };
  }
  return { kind: parts[1] === "dashboard.json" ? "dashboard" : "curriculum", lessonId: null };
}
