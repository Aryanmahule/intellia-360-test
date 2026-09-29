/**
 * lesson-videos.ts
 *
 * Centralized server-side registry mapping lesson IDs to their topic videos,
 * mirroring the EduNotes registry in `edunotes.ts`.
 *
 * Two sources, in order:
 *   1. LESSON_VIDEOS_REGISTRY below — curated videos for a lesson.
 *   2. The lesson's `actionCards.video` in curriculum.json — a single video.
 *
 * Sample IDs shipped with the seed curriculum are ignored so a student never
 * opens a placeholder clip.
 */

import { getCurriculum } from "@/lib/student-data";

import type { LessonVideo } from "@intellia360/shared/types/api/lesson-resources";

export type { LessonVideo };

/**
 * Placeholder IDs used while the curriculum was being seeded.
 * Treated as "no video configured".
 */
const PLACEHOLDER_VIDEO_IDS = new Set(["dQw4w9WgXcQ"]);

/**
 * Curated videos keyed by grade and lessonId.
 *
 * IMPORTANT:
 * lessonId must exactly match the lessonId used in curriculum.json.
 *
 * Example:
 *   grade1: {
 *     "counting-numbers-up-to-100": [
 *       { videoId: "AbCdEfGhIjK", title: "Counting to 100", durationLabel: "4 min" },
 *     ],
 *   },
 */
export const LESSON_VIDEOS_REGISTRY: Record<
  string,
  Record<string, LessonVideo[]>
> = {
  grade1: {
    // Add Grade 1 lesson videos here when they are published.
  },

  grade2: {
    // Add Grade 2 lesson videos here when they are published.
  },
};

/** Extract a YouTube ID from watch, youtu.be, shorts or embed URLs. */
export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // A bare ID was configured rather than a URL.
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );

  return match ? match[1] : null;
}

export function isPlaceholderVideoId(videoId: string): boolean {
  return PLACEHOLDER_VIDEO_IDS.has(videoId);
}

interface TopicWithActionCards {
  id: string;
  title?: string;
  actionCards?: { video?: string | null } | null;
}

/** The lesson's own video from curriculum.json, when one is configured. */
function videoFromCurriculum(
  lessonId: string,
  grade: string
): LessonVideo[] {
  let topic: TopicWithActionCards | undefined;

  try {
    const curriculum = getCurriculum(grade);

    topic = curriculum.chapters
      .flatMap((chapter) => chapter.topics as unknown as TopicWithActionCards[])
      .find((candidate) => candidate.id === lessonId);
  } catch {
    // No curriculum bundled for this grade yet.
    return [];
  }

  const videoId = parseYouTubeId(topic?.actionCards?.video);

  if (!videoId || isPlaceholderVideoId(videoId)) return [];

  return [
    {
      videoId,
      title: topic?.title ? `${topic.title} — lesson video` : "Lesson video",
    },
  ];
}

/** All videos configured for a lesson. Empty when none are set up yet. */
export function getLessonVideos(
  lessonId: string,
  grade: string = "grade1"
): LessonVideo[] {
  const curated = (LESSON_VIDEOS_REGISTRY[grade]?.[lessonId] ?? []).filter(
    (video) => video.videoId && !isPlaceholderVideoId(video.videoId)
  );

  if (curated.length > 0) return curated;

  return videoFromCurriculum(lessonId, grade);
}
