/**
 * Response shape of GET /api/student/leaderboard.
 *
 * Shared by the backend route (app/api/student/leaderboard/route.ts) and the frontend that consumes it.
 */

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string | null;
  grade: string;
  xpPoints: number;
  learningGems: number;
  streakDays: number;
  isCurrentUser: boolean;
}

export interface CurrentUserStats {
  rank: number | null;
  xpPoints: number;
  streakDays: number;
  learningGems: number;
  grade: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  currentUserRank: number | null;
  currentUserStats: CurrentUserStats | null;
}
