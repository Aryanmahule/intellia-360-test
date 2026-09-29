/**
 * lesson-resources.ts
 *
 * Resolves what the student lesson screen shows for one lesson in one grade:
 * the Architecture (interactive lesson) URL, the lesson videos and the EduNotes
 * document. Practice is not resolved here — it stays in the lesson data for the
 * screens that already use it.
 *
 * Sources, highest precedence first:
 *   1. The lesson's `modules` block — what the Editor saves
 *      (src/data/grades/<grade>/lessons/<lesson>.json, or its database mirror on
 *      a read-only host; see src/lib/content/lesson-store.ts).
 *   2. The curriculum topic's `actionCards` (and `vercelLink`) — the existing
 *      Grade 1–12 data in curriculum.json.
 *   3. The curated registries — EDUNOTES_REGISTRY and LESSON_VIDEOS_REGISTRY.
 *
 * A module the Editor has disabled is unavailable; it does not fall back.
 *
 * Lesson files are matched to curriculum topics by id, then by title: some
 * lesson files use a shorter id than their curriculum topic but carry the same
 * title.
 *
 * Seed data points modules at the student's own screens
 * (/student/lesson/architecture, /video, /edunotes). Those are not sources —
 * framing a student screen inside the lesson nested the Header and Sidebar —
 * so they fall through to the next source. Links on sites the app's CSP will
 * not frame (EMBEDDABLE_HOSTS) fall through the same way, instead of showing an
 * empty frame.
 *
 * Everything is read at request time, never from a build-time import, so a save
 * in the Editor is visible on the next page load.
 */
import {
  assertGradeId,
  readStoreDocument,
  storePath,
} from "@/lib/content/curriculum-store";
import { listLessons, type LessonContent } from "@/lib/content/lesson-store";
import { isEmbeddableUrl, type LessonModuleKey } from "@intellia360/shared/content/lesson-modules";
import { EDUNOTES_REGISTRY } from "@/lib/student/edunotes";
import {
  LESSON_VIDEOS_REGISTRY,
  isPlaceholderVideoId,
  parseYouTubeId,
} from "@/lib/student/lesson-videos";

interface CurriculumTopic {
  id?: string;
  lessonId?: string;
  title?: string;
  vercelLink?: string | null;
  actionCards?: Record<string, string | null | undefined> | null;
}

interface CurriculumDocument {
  standaloneTopics?: CurriculumTopic[] | null;
  chapters?: { topics?: CurriculumTopic[] | null }[] | null;
}

interface MatchedLesson {
  lessonId: string;
  content: LessonContent;
}

import type {
  LessonVideo,
  EduNotesSource,
  LessonVideoResources,
  ResolvedLessonResources,
  StudentLessonResources,
} from "@intellia360/shared/types/api/lesson-resources";

export type {
  EduNotesSource,
  LessonVideoResources,
  ResolvedLessonResources,
  StudentLessonResources,
};

type EditorModule = { enabled: false } | { enabled: true; url: string | null };

const DRIVE_FILE_RE =
  /drive\.google\.com\/(?:file\/d\/|(?:open|uc)\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{10,})/;

/** The grade curriculum — the database mirror on a read-only host, a deleted grade as null. */
async function readCurriculum(grade: string): Promise<CurriculumDocument | null> {
  try {
    return (await readStoreDocument(storePath(grade, "curriculum.json"))) as CurriculumDocument | null;
  } catch (err) {
    console.error("[lesson-resources] could not read curriculum for", grade, err);
    return null;
  }
}

function findTopic(curriculum: CurriculumDocument | null, lessonId: string): CurriculumTopic | null {
  if (!curriculum) return null;

  const topics = [
    ...(curriculum.chapters ?? []).flatMap((chapter) => chapter?.topics ?? []),
    ...(curriculum.standaloneTopics ?? []),
  ];

  return topics.find((topic) => topic?.id === lessonId || topic?.lessonId === lessonId) ?? null;
}

function normalizeTitle(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
}

async function findLesson(
  grade: string,
  ids: string[],
  topic: CurriculumTopic | null
): Promise<MatchedLesson | null> {
  const lessons = (await listLessons(grade)).filter(
    (lesson): lesson is MatchedLesson => lesson.content !== null
  );

  const byId = lessons.find(
    (lesson) => ids.includes(lesson.lessonId) || ids.includes(String(lesson.content.id ?? ""))
  );
  if (byId) return byId;

  const title = normalizeTitle(topic?.title);
  if (!title) return null;
  return lessons.find((lesson) => normalizeTitle(lesson.content.title) === title) ?? null;
}

/** The Editor's setting for one module; null when the lesson data has none. */
function editorModule(lesson: LessonContent | null, key: LessonModuleKey): EditorModule | null {
  const modules = lesson?.modules;
  const entry =
    modules && typeof modules === "object" ? (modules as Record<string, unknown>)[key] : null;
  if (!entry || typeof entry !== "object") return null;

  const { enabled, url } = entry as { enabled?: unknown; url?: unknown };
  if (enabled !== true) return { enabled: false };
  return { enabled: true, url: typeof url === "string" && url.trim() ? url.trim() : null };
}

function editorUrl(module: EditorModule | null): string | null {
  return module && module.enabled ? module.url : null;
}

/**
 * An absolute http(s) URL on another site, or null. Site paths and links back
 * into this app are student screens, and are never framed inside the lesson.
 */
function externalUrl(value: unknown, origin: string | null): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    return origin && new URL(url).origin === origin ? null : url;
  } catch {
    return null;
  }
}

/** An external URL the app's CSP lets the lesson screen frame, or null. */
function framedUrl(value: unknown, origin: string | null, video = false): string | null {
  const url = externalUrl(value, origin);
  return url && isEmbeddableUrl(url, { video }) ? url : null;
}

function videoFromUrl(value: unknown, title: string | null, origin: string | null): LessonVideoResources | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const videoId = parseYouTubeId(value);
  if (videoId) {
    if (isPlaceholderVideoId(videoId)) return null;
    return {
      videos: [{ videoId, title: title ? `${title} — lesson video` : "Lesson video" }],
      embedUrl: null,
    };
  }

  const embedUrl = framedUrl(value, origin, true);
  return embedUrl ? { videos: [], embedUrl } : null;
}

function eduNotesFromUrl(value: unknown, fileName: string, origin: string | null): EduNotesSource | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;

  const driveId = url.match(DRIVE_FILE_RE)?.[1];
  if (driveId) return { fileName, fileId: driveId, url: null };

  // A same-site path is a document only when it is not a student screen.
  if (url.startsWith("/")) {
    return url.startsWith("//") || /^\/student(?:[/?#]|$)/i.test(url)
      ? null
      : { fileName, fileId: null, url };
  }

  // EduNotes are fetched server-side and served same-origin, so the frame
  // restriction does not apply here.
  const external = externalUrl(url, origin);
  return external ? { fileName, fileId: null, url: external } : null;
}

/**
 * Resolves the lesson modules for `lessonId` in `gradeParam`.
 * Throws UnsafePathError when the grade id is not a valid grade.
 */
export async function resolveLessonResources(
  lessonId: string,
  gradeParam: string,
  origin: string | null
): Promise<ResolvedLessonResources> {
  const grade = assertGradeId(gradeParam);

  const curriculum = await readCurriculum(grade);
  const topic = findTopic(curriculum, lessonId);

  const ids = [...new Set([lessonId, topic?.id, topic?.lessonId].filter((id): id is string => !!id))];
  const lesson = await findLesson(grade, ids, topic);
  const content = lesson?.content ?? null;
  if (lesson && !ids.includes(lesson.lessonId)) ids.push(lesson.lessonId);

  const cards = topic?.actionCards ?? {};
  const title =
    topic?.title ?? (typeof content?.title === "string" ? content.title : null);

  /* ── Architecture ─────────────────────────────────────────────────────── */
  const architecture = editorModule(content, "architectureModule");
  const architectureUrl =
    architecture?.enabled === false
      ? null
      : framedUrl(editorUrl(architecture), origin) ??
        framedUrl(cards.architecture, origin) ??
        framedUrl(topic?.vercelLink, origin);

  /* ── Video ────────────────────────────────────────────────────────────── */
  const videoModule = editorModule(content, "videoLesson");
  const curated =
    ids
      .map((id) =>
        (LESSON_VIDEOS_REGISTRY[grade]?.[id] ?? []).filter(
          (video) => video.videoId && !isPlaceholderVideoId(video.videoId)
        )
      )
      .find((list) => list.length > 0) ?? [];

  const video: LessonVideoResources =
    videoModule?.enabled === false
      ? { videos: [], embedUrl: null }
      : videoFromUrl(editorUrl(videoModule), title, origin) ??
        (curated.length > 0 ? { videos: curated, embedUrl: null } : null) ??
        videoFromUrl(cards.video, title, origin) ?? { videos: [], embedUrl: null };

  /* ── EduNotes ─────────────────────────────────────────────────────────── */
  const notesModule = editorModule(content, "eduNotes");
  const fileName = `${(title ?? lessonId).replace(/["\\\r\n]/g, "")}.pdf`;
  const registryNote = ids
    .map((id) => EDUNOTES_REGISTRY[grade]?.[id])
    .find((note) => note?.fileId);

  const eduNotes =
    notesModule?.enabled === false
      ? null
      : eduNotesFromUrl(editorUrl(notesModule), fileName, origin) ??
        eduNotesFromUrl(cards.edunotes, fileName, origin) ??
        (registryNote
          ? { fileName: registryNote.fileName, fileId: registryNote.fileId, url: null }
          : null);

  return {
    lessonId,
    grade,
    title,
    found: Boolean(topic || lesson),
    architectureUrl,
    video,
    eduNotes,
  };
}
