"use client";

/**
 * /student/quiz — the practice quiz index.
 *
 * This route did not exist, so the sidebar's "Quizzes" entry pointed straight
 * at a single hardcoded quiz id and the section was effectively invisible.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import "./quiz-index.css";
import { apiFetch } from "@/lib/api";

interface QuizListItem {
  quizId: string;
  lessonId: string | null;
  lessonTitle: string;
  chapterTitle: string | null;
  questionCount: number;
  estimatedMinutes: number;
  bestScore: number | null;
  attempts: number;
}

function QuizIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 9.2a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" />
    </svg>
  );
}

export default function StudentQuizIndexPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await apiFetch("/api/student/quiz", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          throw new Error(json?.message ?? "Could not load your quizzes.");
        }

        setQuizzes(Array.isArray(json.data) ? json.data : []);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load your quizzes.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const attempted = quizzes.filter((q) => q.attempts > 0);
  const averageBest = attempted.length
    ? Math.round(
        attempted.reduce((total, q) => total + (q.bestScore ?? 0), 0) / attempted.length
      )
    : null;

  return (
    <div className="student-quizzes-page">
      <div className="student-quizzes-shell">
        <header className="student-quizzes-header">
          <div>
            <span className="student-quizzes-eyebrow">PRACTICE</span>
            <h1>Quizzes</h1>
            <p>
              Short practice sets drawn from your grade&apos;s topics. Every quiz is five
              questions, and your best score is kept for each one.
            </p>
          </div>
          <div className="student-quizzes-header-icon">
            <QuizIcon />
          </div>
        </header>

        {!loading && !error && quizzes.length > 0 && (
          <section className="student-quizzes-summary" aria-label="Quiz progress">
            <div className="student-quiz-stat">
              <p className="student-quiz-stat-label">Available</p>
              <p className="student-quiz-stat-value">{quizzes.length}</p>
            </div>
            <div className="student-quiz-stat">
              <p className="student-quiz-stat-label">Attempted</p>
              <p className="student-quiz-stat-value">{attempted.length}</p>
            </div>
            <div className="student-quiz-stat">
              <p className="student-quiz-stat-label">Average best</p>
              <p className="student-quiz-stat-value">
                {averageBest === null ? "—" : `${averageBest}%`}
              </p>
            </div>
          </section>
        )}

        {error && (
          <div className="student-quizzes-empty" role="alert">
            <strong>Couldn&apos;t load your quizzes</strong>
            {error}
          </div>
        )}

        {loading && (
          <div className="student-quizzes-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="student-quiz-skeleton" />
            ))}
          </div>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <div className="student-quizzes-empty">
            <strong>No quizzes yet</strong>
            Once lessons are published for your grade, their practice quizzes appear here.
          </div>
        )}

        {!loading && !error && quizzes.length > 0 && (
          <div className="student-quizzes-grid">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.quizId}
                href={`/student/quiz/${quiz.quizId}`}
                className="student-quiz-card"
              >
                <div className="student-quiz-card-top">
                  <div>
                    {quiz.chapterTitle && (
                      <p className="student-quiz-card-chapter">{quiz.chapterTitle}</p>
                    )}
                    <h2 className="student-quiz-card-title">{quiz.lessonTitle}</h2>
                  </div>
                  <span
                    className={`student-quiz-badge ${
                      quiz.bestScore === null ? "is-new" : "is-scored"
                    }`}
                  >
                    {quiz.bestScore === null ? "New" : `${quiz.bestScore}%`}
                  </span>
                </div>

                <p className="student-quiz-card-meta">
                  <span>{quiz.questionCount} questions</span>
                  <span>{quiz.estimatedMinutes} min</span>
                  <span>
                    {quiz.attempts === 0
                      ? "Not attempted"
                      : `${quiz.attempts} attempt${quiz.attempts === 1 ? "" : "s"}`}
                  </span>
                </p>

                <p className="student-quiz-card-cta">
                  {quiz.attempts === 0 ? "Start quiz →" : "Try again →"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
