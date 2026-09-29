/**
 * Lesson resource shapes: GET /api/student/lesson-resources and the EduNotes source it resolves.
 *
 * Shared by the backend route (lib/student/lesson-resources.ts) and the frontend that consumes it.
 */

export interface LessonVideo {
  /** YouTube video ID, e.g. "abc123XYZ". */
  videoId: string;
  title: string;
  description?: string;
  durationLabel?: string;
}

/** Where a lesson's EduNotes PDF is fetched from. */
export interface EduNotesSource {
  fileName: string;
  /** Google Drive file id, downloaded through the EduNotes content route. */
  fileId: string | null;
  /** A direct PDF URL (absolute, or a same-site path) when there is no Drive id. */
  url: string | null;
}

export interface LessonVideoResources {
  /** YouTube videos, played by the existing lesson video player. */
  videos: LessonVideo[];
  /** A non-YouTube video URL from the lesson data, embedded as-is. */
  embedUrl: string | null;
}

export interface ResolvedLessonResources {
  lessonId: string;
  grade: string;
  title: string | null;
  /** False when the grade has neither a curriculum topic nor a lesson file for this id. */
  found: boolean;
  architectureUrl: string | null;
  video: LessonVideoResources;
  eduNotes: EduNotesSource | null;
}

/** What /api/student/lesson-resources returns to the lesson screen. */
export type StudentLessonResources = Omit<ResolvedLessonResources, "eduNotes"> & {
  eduNotes: { available: boolean };
};
