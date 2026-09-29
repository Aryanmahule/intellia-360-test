/**
 * Server-side reward table for lesson activities.
 *
 * XP and gems used to be taken from the request body, so a student could award
 * themselves any balance with a single curl — the values that drive the public
 * leaderboard, the rewards shop and the streak badges were set by the client.
 * The API now resolves rewards here and ignores whatever the caller sends.
 *
 * The amounts mirror what the dashboard already displays, so nothing a learner
 * sees changes; only the source of truth moves to the server.
 */
import fs from "fs";
import { resolveInStore, assertGradeId, assertLessonId } from "@/lib/content/curriculum-store";

export interface ActivityReward {
  xp: number;
  gems: number;
}

/** Base table, keyed by activityType. Unknown activity types earn nothing. */
const REWARD_TABLE: Record<string, ActivityReward> = {
  architecture: { xp: 50, gems: 5 },
  practice: { xp: 30, gems: 0 },
  edunotes: { xp: 20, gems: 0 },
  video: { xp: 20, gems: 5 },
  reflection: { xp: 20, gems: 0 },
};

/** Upper bound on any single award, in case a lesson file carries a bad value. */
const MAX_XP = 500;
const MAX_GEMS = 50;

function clamp(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.min(Math.floor(value), max);
}

/**
 * Resolve the reward for one activity.
 *
 * `architecture` is the one activity whose reward the dashboard reads from the
 * lesson itself (`xpReward` / `gemsReward`), falling back to the table when the
 * lesson does not define them — which today is every lesson. That lookup is
 * reproduced here so the server stays authoritative if those fields are added.
 */
export function resolveActivityReward(
  activityType: string,
  grade: string,
  lessonId: string
): ActivityReward {
  const base = REWARD_TABLE[activityType];
  if (!base) return { xp: 0, gems: 0 };

  if (activityType !== "architecture") return base;

  try {
    const file = resolveInStore(
      assertGradeId(grade),
      "lessons",
      `${assertLessonId(lessonId)}.json`
    );
    if (!fs.existsSync(file)) return base;

    const lesson = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    return {
      xp: clamp(lesson.xpReward, base.xp, MAX_XP),
      gems: clamp(lesson.gemsReward, base.gems, MAX_GEMS),
    };
  } catch {
    // A malformed or unreadable lesson file must not block progress — fall back
    // to the table rather than failing the completion.
    return base;
  }
}

/** Activity types the API accepts. */
export const KNOWN_ACTIVITY_TYPES = Object.keys(REWARD_TABLE);
