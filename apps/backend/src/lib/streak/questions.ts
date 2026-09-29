/**
 * Daily quiz question selection engine.
 *
 * Design:
 *  • Each user gets exactly 5 questions per day.
 *  • Questions rotate daily so no two consecutive days are identical.
 *  • Selection is deterministic: same user + same date always returns
 *    the same set — no randomness at serve time, fully reproducible.
 *
 * Algorithm:
 *  1. Filter the full bank to questions that match the student's grade
 *     plus the "all" bucket.
 *  2. Compute a 32-bit seed from SHA-256(userId + dateKey).
 *  3. Use a fast LCG (linear-congruential) shuffle on the filtered list.
 *  4. Return the first 5.
 */

import crypto from "crypto";
import rawBank from "@/data/daily-questions.json";

export interface QuizOption {
  id:        string;
  text:      string;
  isCorrect: boolean;
}

export interface DailyQuestion {
  id:           string;
  grade:        string;
  topic:        string;
  difficulty:   string;
  questionText: string;
  options:      QuizOption[];
  explanation:  string;
  hint:         string;
}

const QUESTIONS_PER_DAY = 5;

/** Deterministic 32-bit seed from userId + dateKey */
function makeSeed(userId: string, dateKey: string): number {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${dateKey}`)
    .digest("hex");
  return parseInt(hash.slice(0, 8), 16);
}

/** LCG shuffle — in-place Fisher-Yates with LCG-derived "random" numbers */
function lcgShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice(); // copy
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    // LCG: next = (a*s + c) mod m  (Numerical Recipes constants)
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Return today's 5 questions for a given user and grade. */
export function getDailyQuestions(
  userId:  string,
  grade:   string,
  dateKey: string
): DailyQuestion[] {
  const bank = rawBank as DailyQuestion[];

  // Grade match + universal bucket
  const pool = bank.filter(
    (q) => q.grade === grade || q.grade === "all"
  );

  if (pool.length === 0) {
    // Fallback: use the full bank
    const seed = makeSeed(userId, dateKey);
    return lcgShuffle(bank, seed).slice(0, QUESTIONS_PER_DAY);
  }

  const seed = makeSeed(userId, dateKey);
  return lcgShuffle(pool, seed).slice(0, QUESTIONS_PER_DAY);
}

/** UTC date key — "YYYY-MM-DD" */
export function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}
