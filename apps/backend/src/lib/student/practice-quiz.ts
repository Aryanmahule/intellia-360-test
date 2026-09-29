/**
 * Lesson practice quizzes.
 *
 * The quiz screen, its CSS and its submit flow all shipped, but nothing ever
 * served them: every lesson's `practiceModule.url` pointed at the same
 * hardcoded `/student/quiz/practice-1`, and no route answered
 * `/api/student/quiz/[id]`. This builds real quizzes from the question bank the
 * daily quiz already uses, so the feature has content without a second
 * authoring pipeline.
 *
 * Two rules matter here:
 *
 *  • Question selection is seeded by the quiz id alone — not the user — so the
 *    server can re-derive the exact same question set when grading a
 *    submission, without trusting anything the browser sends back.
 *  • `isCorrect` never leaves this module. The client receives options with
 *    text only; scoring happens server-side in `gradeQuiz`.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import rawBank from "@/data/daily-questions.json";
import type { DailyQuestion } from "@/lib/streak/questions";

const DATA_ROOT = path.join(process.cwd(), "src", "data", "grades");
const QUESTIONS_PER_QUIZ = 5;
const SECONDS_PER_QUESTION = 60;

/** Quiz ids are `practice-<lessonId>`; `practice-1` is the legacy general one. */
const PREFIX = "practice-";
export const GENERAL_QUIZ_ID = "practice-1";

export interface PracticeQuizSummary {
  quizId: string;
  lessonId: string | null;
  lessonTitle: string;
  chapterTitle: string | null;
  questionCount: number;
  estimatedMinutes: number;
}

export interface PublicQuizOption {
  id: string;
  text: string;
}

export interface PublicQuizQuestion {
  id: string;
  question: string;
  options: PublicQuizOption[];
}

export interface PublicQuiz {
  id: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  durationSeconds: number;
  questions: PublicQuizQuestion[];
}

/* ── Question selection ──────────────────────────────────────────────────── */

function seedFrom(value: string): number {
  return parseInt(
    crypto.createHash("sha256").update(value).digest("hex").slice(0, 8),
    16
  );
}

/** Same LCG shuffle the daily quiz uses, so both draw from the bank alike. */
function lcgShuffle<T>(input: T[], seed: number): T[] {
  const arr = input.slice();
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function questionsFor(quizId: string, grade: string): DailyQuestion[] {
  const bank = rawBank as DailyQuestion[];
  const pool = bank.filter((q) => q.grade === grade || q.grade === "all");
  const source = pool.length >= QUESTIONS_PER_QUIZ ? pool : bank;
  // Seeded by quiz id + grade only — never the user — so grading can rebuild it.
  return lcgShuffle(source, seedFrom(`${quizId}:${grade}`)).slice(0, QUESTIONS_PER_QUIZ);
}

/* ── Curriculum lookup ───────────────────────────────────────────────────── */

type LessonFile = {
  id?: string;
  title?: string;
  chapterTitle?: string;
  estimatedMinutes?: number;
};

function readLessons(grade: string): LessonFile[] {
  const dir = path.join(DATA_ROOT, grade, "lessons");
  if (!fs.existsSync(dir)) return [];

  const lessons: LessonFile[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      lessons.push({
        id: parsed.id ?? file.replace(/\.json$/, ""),
        title: parsed.title,
        chapterTitle: parsed.chapterTitle,
        estimatedMinutes: parsed.estimatedMinutes,
      });
    } catch {
      // A malformed lesson file should hide one quiz, not break the list.
    }
  }
  return lessons;
}

export function quizIdForLesson(lessonId: string): string {
  return `${PREFIX}${lessonId}`;
}

function lessonIdFromQuizId(quizId: string): string | null {
  if (!quizId.startsWith(PREFIX)) return null;
  const rest = quizId.slice(PREFIX.length);
  return rest && rest !== "1" ? rest : null;
}

/** Every practice quiz available to a grade — one per lesson, plus the general one. */
export function listQuizzesForGrade(grade: string): PracticeQuizSummary[] {
  const lessons = readLessons(grade);

  const perLesson = lessons
    .filter((l): l is LessonFile & { id: string } => Boolean(l.id))
    .map((l) => ({
      quizId: quizIdForLesson(l.id),
      lessonId: l.id,
      lessonTitle: l.title ?? l.id,
      chapterTitle: l.chapterTitle ?? null,
      questionCount: QUESTIONS_PER_QUIZ,
      estimatedMinutes: Math.max(
        1,
        Math.round((QUESTIONS_PER_QUIZ * SECONDS_PER_QUESTION) / 60)
      ),
    }))
    .sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));

  return [
    {
      quizId: GENERAL_QUIZ_ID,
      lessonId: null,
      lessonTitle: "Mixed practice",
      chapterTitle: "All topics",
      questionCount: QUESTIONS_PER_QUIZ,
      estimatedMinutes: 5,
    },
    ...perLesson,
  ];
}

/** The quiz as the browser may see it — no answer keys. */
export function buildQuiz(quizId: string, grade: string): PublicQuiz | null {
  const questions = questionsFor(quizId, grade);
  if (questions.length === 0) return null;

  const lessonId = lessonIdFromQuizId(quizId);
  let lessonTitle = "Mixed practice";

  if (lessonId) {
    const lesson = readLessons(grade).find((l) => l.id === lessonId);
    // An unknown lesson id still gets a quiz — the bank is grade-scoped, so the
    // questions are valid practice either way.
    lessonTitle = lesson?.title ?? lessonId;
  }

  return {
    id: quizId,
    title: lessonId ? `${lessonTitle} — Practice` : "Mixed practice quiz",
    lessonId: lessonId ?? "mixed-practice",
    lessonTitle,
    durationSeconds: questions.length * SECONDS_PER_QUESTION,
    questions: questions.map((q) => ({
      id: q.id,
      question: q.questionText,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}

export interface GradedQuiz {
  quizId: string;
  lessonId: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
}

/**
 * Scores a submission against the server's own copy of the questions.
 * `answers` maps questionId -> optionId; anything unrecognised counts as wrong.
 */
export function gradeQuiz(
  quizId: string,
  grade: string,
  answers: Record<string, string>
): GradedQuiz | null {
  const questions = questionsFor(quizId, grade);
  if (questions.length === 0) return null;

  let correct = 0;
  for (const q of questions) {
    const chosen = answers[q.id];
    if (chosen && q.options.some((o) => o.id === chosen && o.isCorrect)) correct++;
  }

  return {
    quizId,
    lessonId: lessonIdFromQuizId(quizId) ?? "mixed-practice",
    totalQuestions: questions.length,
    correctAnswers: correct,
    scorePercent: Math.round((correct / questions.length) * 100),
  };
}
