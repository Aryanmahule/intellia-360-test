/**
 * Lesson storage for the editor.
 *
 * Lessons are JSON files under src/data/grades, mirrored into MongoDB on every
 * write. Where those files are writable — local development — they stay the
 * source of truth. On a read-only deployment the mirrored database copy is the
 * store instead: saves go to the database, reads prefer it over the file that
 * shipped with the build, and a deletion is a tombstone that hides that file.
 * The mechanics live in curriculum-store.ts (readStoreDocument and friends),
 * shared with the curriculum and grade endpoints.
 *
 * Student pages read lessons through src/lib/student/lesson-resources.ts at
 * request time, with the same precedence.
 */
import fs from "fs";
import path from "path";
import {
  deleteStoreDocuments,
  isStoreWritable,
  listMirroredDocuments,
  readStoreDocument,
  resolveInStore,
  storePath,
  writeStoreDocument,
  type StoredDocument,
} from "@/lib/content/curriculum-store";

export { StoreError as LessonStoreError } from "@/lib/content/curriculum-store";

export type LessonContent = Record<string, unknown>;

export interface LessonRef {
  gradeId: string;
  lessonId: string;
}

export type SavedLesson = StoredDocument;

function lessonKey(ref: LessonRef): string {
  return storePath(ref.gradeId, "lessons", `${ref.lessonId}.json`);
}

/** The current lesson, or null when it does not exist or was deleted. */
export async function readLesson(ref: LessonRef): Promise<LessonContent | null> {
  return (await readStoreDocument(lessonKey(ref))) as LessonContent | null;
}

/** Stores a lesson, or throws LessonStoreError when nothing durable accepted it. */
export async function saveLesson(
  ref: LessonRef,
  content: LessonContent,
  updatedBy: string
): Promise<SavedLesson> {
  return writeStoreDocument(
    {
      path: lessonKey(ref),
      gradeId: ref.gradeId,
      kind: "lesson",
      lessonId: ref.lessonId,
      content,
      updatedBy,
    },
    "lesson"
  );
}

/** Deletes a lesson and returns what was removed, or null when there was nothing to delete. */
export async function deleteLesson(ref: LessonRef, updatedBy: string): Promise<LessonContent | null> {
  const removed = await readLesson(ref);
  if (!removed) return null;

  await deleteStoreDocuments(
    [
      {
        path: lessonKey(ref),
        gradeId: ref.gradeId,
        kind: "lesson",
        lessonId: ref.lessonId,
        content: removed,
        updatedBy,
      },
    ],
    "lesson"
  );
  return removed;
}

/** Every lesson in a grade. `content` is null for a file that is not valid JSON. */
export async function listLessons(gradeId: string): Promise<{ lessonId: string; content: LessonContent | null }[]> {
  const lessons = new Map<string, LessonContent | null>();

  const dir = resolveInStore(gradeId, "lessons");
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const lessonId = file.replace(/\.json$/, "");
      try {
        lessons.set(lessonId, JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as LessonContent);
      } catch {
        lessons.set(lessonId, null);
      }
    }
  }

  if (!isStoreWritable()) {
    for (const doc of await listMirroredDocuments(gradeId, "lesson")) {
      const lessonId = doc.lessonId ?? path.posix.basename(doc.path, ".json");
      if (doc.deletedAt) lessons.delete(lessonId);
      else lessons.set(lessonId, doc.content as LessonContent);
    }
  }

  return [...lessons].map(([lessonId, content]) => ({ lessonId, content }));
}
