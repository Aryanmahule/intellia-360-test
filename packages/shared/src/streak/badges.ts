/**
 * Streak badge definitions.
 * Each milestone has a badgeId that maps to UnlockedBadge records.
 *
 * Convention: streak_Nd  (N = streak days threshold)
 */

export interface StreakBadge {
  badgeId:     string;
  title:       string;
  emoji:       string;
  description: string;
  streakDays:  number;        // unlock when streakDays >= this
  xpBonus:     number;        // extra XP awarded on first unlock
  gemBonus:    number;        // extra gems awarded on first unlock
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    badgeId:     "streak_3d",
    title:       "Hat Trick",
    emoji:       "🎩",
    description: "Completed the Daily Quiz 3 days in a row!",
    streakDays:  3,
    xpBonus:     30,
    gemBonus:    10,
  },
  {
    badgeId:     "streak_7d",
    title:       "Week Warrior",
    emoji:       "🔥",
    description: "7-day streak — you are on fire!",
    streakDays:  7,
    xpBonus:     75,
    gemBonus:    25,
  },
  {
    badgeId:     "streak_14d",
    title:       "Fortnight Champion",
    emoji:       "⚡",
    description: "Two full weeks of daily quizzes — incredible!",
    streakDays:  14,
    xpBonus:     150,
    gemBonus:    50,
  },
  {
    badgeId:     "streak_30d",
    title:       "Monthly Master",
    emoji:       "🏅",
    description: "30 consecutive days — you are a true scholar!",
    streakDays:  30,
    xpBonus:     300,
    gemBonus:    100,
  },
  {
    badgeId:     "streak_60d",
    title:       "Diamond Mind",
    emoji:       "💎",
    description: "60 days straight — absolutely legendary!",
    streakDays:  60,
    xpBonus:     600,
    gemBonus:    200,
  },
  {
    badgeId:     "streak_100d",
    title:       "Century Legend",
    emoji:       "👑",
    description: "100-day streak — you are in the Hall of Fame!",
    streakDays:  100,
    xpBonus:     1000,
    gemBonus:    500,
  },
];

/** Perfect-score (5/5) bonus badge */
export const PERFECT_SCORE_BADGE: StreakBadge = {
  badgeId:     "daily_perfect",
  title:       "Perfect Score!",
  emoji:       "⭐",
  description: "Got every question right in a Daily Quiz — brilliant!",
  streakDays:  0,
  xpBonus:     50,
  gemBonus:    20,
};

/** Return any streak milestones that should fire for a given streakDays count. */
export function getNewStreakBadges(streakDays: number): StreakBadge[] {
  return STREAK_BADGES.filter((b) => b.streakDays === streakDays);
}
