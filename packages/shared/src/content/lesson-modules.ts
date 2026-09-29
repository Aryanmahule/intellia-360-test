/**
 * Lesson module links — EduNotes, architecture, video and practice.
 *
 * Shared by the lesson editor form and the lesson API so both apply one rule:
 * a link is required only while its module is enabled, and any link given must
 * be a site path ("/student/lesson/video") or an absolute http(s) URL.
 *
 * Architecture and video links are framed inside the student lesson screen, so
 * an absolute link must also be on a site the app's Content-Security-Policy
 * allows it to frame (EMBEDDABLE_HOSTS).
 *
 * No Node APIs here — this module is imported by client components.
 */
import type { LessonModuleConfig } from "../types/student";

export const LESSON_MODULE_KEYS = [
  "architectureModule",
  "videoLesson",
  "practiceModule",
  "eduNotes",
] as const;

export type LessonModuleKey = (typeof LESSON_MODULE_KEYS)[number];
export type LessonModules = Record<LessonModuleKey, LessonModuleConfig>;
export type LessonModuleErrors = Partial<Record<LessonModuleKey, string>>;

export const LESSON_MODULE_LABELS: Record<LessonModuleKey, string> = {
  architectureModule: "Architecture module",
  videoLesson:        "Video lesson",
  practiceModule:     "Practice module",
  eduNotes:           "EduNotes",
};

/**
 * Sites the student lesson screen may frame.
 *
 * Must match the `frame-src` directive in next.config.ts: a link to any other
 * site is blocked by the app's own Content-Security-Policy and would show as an
 * empty frame. (next.config.ts cannot import this module — its module
 * resolution is limited to CommonJS — so the two lists are kept in step by hand.)
 */
export const EMBEDDABLE_HOSTS: readonly string[] = [
  "*.vercel.app",
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "drive.google.com",
];

/** YouTube links are played through youtube-nocookie.com, so every YouTube host works for videos. */
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"];

/** Modules whose links are framed on the student lesson screen. */
const FRAMED_MODULES: Partial<Record<LessonModuleKey, { video: boolean }>> = {
  architectureModule: { video: false },
  videoLesson:        { video: true },
};

/** Whether the lesson screen may frame this absolute URL under the app's CSP. */
export function isEmbeddableUrl(url: string, { video = false }: { video?: boolean } = {}): boolean {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }

  if (video && YOUTUBE_HOSTS.includes(host)) return true;

  return EMBEDDABLE_HOSTS.some((pattern) =>
    pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) : host === pattern
  );
}

/**
 * Every module present with a boolean `enabled` and a trimmed `url`.
 * Lesson files written by hand or by older code can omit a module entirely,
 * which previously crashed the editor form on `modules[key].url`.
 */
export function normalizeLessonModules(raw: unknown): LessonModules {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as LessonModules;
  for (const key of LESSON_MODULE_KEYS) {
    const entry = source[key] && typeof source[key] === "object"
      ? (source[key] as Partial<LessonModuleConfig>)
      : {};
    out[key] = {
      enabled: entry.enabled === true,
      url:     typeof entry.url === "string" ? entry.url.trim() : "",
    };
  }
  return out;
}

/** A same-site path or an absolute http(s) URL. */
export function isValidModuleUrl(url: string): boolean {
  // "//host" is protocol-relative — it leaves the site, so it is not a path.
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** One message per invalid module; an empty object means the links are valid. */
export function validateLessonModules(modules: LessonModules): LessonModuleErrors {
  const errors: LessonModuleErrors = {};
  for (const key of LESSON_MODULE_KEYS) {
    const { enabled, url } = modules[key];
    if (!url) {
      if (enabled) errors[key] = "Add a link, or untick Enabled.";
      continue;
    }
    if (!isValidModuleUrl(url)) {
      errors[key] = "Use a site path like /student/lesson/video or a full https:// link.";
      continue;
    }
    const framed = FRAMED_MODULES[key];
    if (framed && !url.startsWith("/") && !isEmbeddableUrl(url, framed)) {
      errors[key] = framed.video
        ? "Students can't play this site here. Use a YouTube, Google Drive or *.vercel.app link."
        : "Students can't open this site inside the lesson. Use a *.vercel.app or Google Drive link.";
    }
  }
  return errors;
}
