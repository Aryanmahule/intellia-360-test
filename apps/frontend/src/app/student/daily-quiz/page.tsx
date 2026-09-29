
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import "./quiz.css";
import { apiFetch } from "@/lib/api";

type QuizOption = {
  id: string;
  text: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  topic?: string;
  difficulty?: string;
};

type QuizData = {
  id: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  durationSeconds: number;
  questions: QuizQuestion[];
  topic?: string;
  chapterTitle?: string;
  grade?: string;
  difficulty?: string;
  source?: string;
  teacherName?: string;
  xpReward?: number;
};

type QuizResponse = {
  success: boolean;
  message?: string;
  data?: QuizData;
};

type SubmitResponse = {
  success: boolean;
  message?: string;
  data?: {
    quizId: string;
    lessonId: string;
    scorePercent: number;
    correctAnswers: number;
    totalQuestions: number;
    xpEarned: number;
  };
};

// GET /api/student/daily-quiz — today's streak quiz. This route has no quiz id
// in its URL, so that is the quiz it serves (see loadDailyQuiz).
type DailyQuizApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    dateKey: string;
    grade: string;
    alreadyCompleted: boolean;
    attempt?: { score: number; xpAwarded: number };
    questions: {
      id: string;
      questionText: string;
      options: QuizOption[];
      topic?: string;
      difficulty?: string;
    }[];
  };
};

type DailySubmitResponse = {
  success: boolean;
  message?: string;
  data?: { score: number; totalQuestions: number; xpAwarded: number };
};

const DAILY_SECONDS_PER_QUESTION = 60;

type QuizState = "loading" | "ready" | "submitting" | "completed" | "error";

type CachedQuizRecord = {
  savedAt: number;
  quiz: QuizData;
};

const CACHE_KEY = "intellia360:offline:topic-quizzes:v1";
const ANSWER_KEY = "intellia360:offline:quiz-answers:v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable/full. The quiz still works for the current session.
  }
}

function getQuizRouteId(params: Record<string, string | string[] | undefined>): string {
  const value = params.quizId ?? params.id;
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeTopic(topic?: string): string {
  return topic?.trim() || "General";
}

export default function StudentQuizPage() {
  const params = useParams<Record<string, string | string[] | undefined>>();
  const router = useRouter();

  const routeQuizId = getQuizRouteId(params);

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [error, setError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<Record<string, CachedQuizRecord>>({});

  const [selectedTopic, setSelectedTopic] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [result, setResult] = useState<{
    scorePercent: number;
    correctAnswers: number;
    totalQuestions: number;
    xpEarned: number;
    synced: boolean;
  } | null>(null);

  /* ---------------------------------------------------------
     Topic-wise offline quiz cache
     --------------------------------------------------------- */

  const saveQuizToOffline = useCallback((quizToSave: QuizData) => {
    const topic = normalizeTopic(quizToSave.topic || quizToSave.questions[0]?.topic);
    const current = readJson<Record<string, CachedQuizRecord>>(CACHE_KEY, {});

    const next = {
      ...current,
      [topic]: {
        savedAt: Date.now(),
        quiz: quizToSave,
      },
    };

    writeJson(CACHE_KEY, next);
    setOfflineRecords(next);
  }, []);

  const loadDailyQuiz = useCallback(async (): Promise<QuizData | null> => {
    try {
      const response = await apiFetch("/api/student/daily-quiz", { cache: "no-store" });
      const payload = (await response.json()) as DailyQuizApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Unable to load today's quiz.");
      }

      const daily = payload.data;
      const dailyQuiz: QuizData = {
        id: `daily-${daily.dateKey}`,
        title: "Daily Quiz",
        lessonId: "daily-quiz",
        lessonTitle: "Today's daily challenge",
        durationSeconds: daily.questions.length * DAILY_SECONDS_PER_QUESTION,
        questions: daily.questions.map((question) => ({
          id: question.id,
          question: question.questionText,
          options: question.options,
          topic: question.topic,
          difficulty: question.difficulty,
        })),
        topic: "Daily Quiz",
        grade: daily.grade,
        source: "daily",
      };

      setQuiz(dailyQuiz);
      setSelectedTopic(normalizeTopic(dailyQuiz.topic));

      // One attempt per day: show today's stored result instead of the questions.
      if (daily.alreadyCompleted && daily.attempt) {
        const total = Math.max(daily.questions.length, 1);
        setResult({
          scorePercent: Math.round((daily.attempt.score / total) * 100),
          correctAnswers: daily.attempt.score,
          totalQuestions: daily.questions.length,
          xpEarned: daily.attempt.xpAwarded,
          synced: true,
        });
        setQuizState("completed");
        return dailyQuiz;
      }

      setSecondsLeft(dailyQuiz.durationSeconds);
      setQuizState("ready");
      return dailyQuiz;
    } catch (requestError) {
      console.error("Daily quiz load error:", requestError);
      return null;
    }
  }, []);

  const loadOnlineQuiz = useCallback(async (): Promise<QuizData | null> => {
    // /student/daily-quiz has no quiz id in its URL; it serves today's daily
    // streak quiz. Waiting for an id that never exists here is what left the
    // page stuck on "Quiz unavailable".
    if (!routeQuizId) {
      return loadDailyQuiz();
    }

    try {
      const response = await apiFetch(
        `/api/student/quiz/${encodeURIComponent(routeQuizId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to load quiz.");
      }

      const payload = (await response.json()) as QuizResponse;

      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Quiz data is unavailable.");
      }

      saveQuizToOffline(payload.data);
      setQuiz(payload.data);
      setSelectedTopic(normalizeTopic(payload.data.topic || payload.data.questions[0]?.topic));
      setSecondsLeft(Math.max(0, payload.data.durationSeconds || 0));
      setQuizState("ready");

      return payload.data;
    } catch (requestError) {
      console.error("Student quiz load error:", requestError);
      return null;
    }
  }, [routeQuizId, saveQuizToOffline, loadDailyQuiz]);

  const loadOfflineTopicQuiz = useCallback(
    (topic: string): QuizData | null => {
      const records = readJson<Record<string, CachedQuizRecord>>(CACHE_KEY, {});
      setOfflineRecords(records);

      const record = records[topic];

      if (!record?.quiz) {
        return null;
      }

      setQuiz(record.quiz);
      setSelectedTopic(topic);
      setCurrentQuestion(0);
      setAnswers({});
      setResult(null);
      setShowHint(false);
      setSecondsLeft(Math.max(0, record.quiz.durationSeconds || 0));
      setQuizState("ready");
      return record.quiz;
    },
    [],
  );

  /* ---------------------------------------------------------
     Online/offline state
     --------------------------------------------------------- */

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const records = readJson<Record<string, CachedQuizRecord>>(CACHE_KEY, {});
    setOfflineRecords(records);
  }, []);

  /* ---------------------------------------------------------
     Initial quiz load
     --------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setQuizState("loading");
      setError(null);

      const records = readJson<Record<string, CachedQuizRecord>>(CACHE_KEY, {});
      if (!cancelled) setOfflineRecords(records);

      const routeRecord = Object.values(records).find(
        (record) => record.quiz.id === routeQuizId,
      );

      if (!navigator.onLine && routeRecord?.quiz) {
        setOfflineMode(true);
        setQuiz(routeRecord.quiz);
        setSelectedTopic(
          normalizeTopic(
            routeRecord.quiz.topic || routeRecord.quiz.questions[0]?.topic,
          ),
        );
        setSecondsLeft(Math.max(0, routeRecord.quiz.durationSeconds || 0));
        setQuizState("ready");
        return;
      }

      const onlineQuiz = await loadOnlineQuiz();

      if (cancelled) return;

      if (onlineQuiz) {
        setOfflineMode(false);
        return;
      }

      if (routeRecord?.quiz) {
        setOfflineMode(true);
        setQuiz(routeRecord.quiz);
        setSelectedTopic(
          normalizeTopic(
            routeRecord.quiz.topic || routeRecord.quiz.questions[0]?.topic,
          ),
        );
        setSecondsLeft(Math.max(0, routeRecord.quiz.durationSeconds || 0));
        setQuizState("ready");
        return;
      }

      setError(
        navigator.onLine
          ? "We couldn't load this quiz. Please try again in a moment."
          : "This quiz is not available offline yet. Connect to the internet once to save it for offline use.",
      );
      setQuizState("error");
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [routeQuizId, loadOnlineQuiz]);

  /* ---------------------------------------------------------
     Restore answers for the current quiz
     --------------------------------------------------------- */

  useEffect(() => {
    if (!quiz) return;

    const allSaved = readJson<Record<string, Record<string, string>>>(ANSWER_KEY, {});
    setAnswers(allSaved[quiz.id] || {});
    setCurrentQuestion(0);
    setResult(null);
    setShowHint(false);
  }, [quiz?.id]);

  /* ---------------------------------------------------------
     Timer
     --------------------------------------------------------- */

  useEffect(() => {
    if (quizState !== "ready" || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quizState, secondsLeft]);

  const availableTopics = useMemo(() => {
    const topicMap = new Map<string, CachedQuizRecord>();

    Object.entries(offlineRecords).forEach(([topic, record]) => {
      if (record.quiz.questions.length > 0) {
        topicMap.set(topic, record);
      }
    });

    if (quiz && quiz.questions.length > 0) {
      const topic = normalizeTopic(quiz.topic || quiz.questions[0]?.topic);
      topicMap.set(topic, {
        savedAt: Date.now(),
        quiz,
      });
    }

    return Array.from(topicMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([topic, record]) => ({
        topic,
        quiz: record.quiz,
      }));
  }, [offlineRecords, quiz]);

  const current = quiz?.questions[currentQuestion] ?? null;

  const answeredCount = quiz
    ? quiz.questions.filter((question) => Boolean(answers[question.id])).length
    : 0;

  const progressPercent = quiz
    ? Math.round((answeredCount / Math.max(quiz.questions.length, 1)) * 100)
    : 0;

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [secondsLeft]);

  const handleAnswer = (questionId: string, optionId: string) => {
    const nextAnswers = {
      ...answers,
      [questionId]: optionId,
    };

    setAnswers(nextAnswers);

    const allSaved = readJson<Record<string, Record<string, string>>>(ANSWER_KEY, {});
    writeJson(ANSWER_KEY, {
      ...allSaved,
      [quiz?.id || "unknown"]: nextAnswers,
    });
  };

  const calculateResult = useCallback(() => {
    if (!quiz) return null;

    let correctAnswers = 0;

    quiz.questions.forEach((question) => {
      const selectedId = answers[question.id];
      const correctOption = question.options.find(
        (option) => option.id === "correct" || option.id === "answer",
      );

      if (selectedId && correctOption && selectedId === correctOption.id) {
        correctAnswers += 1;
      }
    });

    /*
      Offline question banks may use one of several common conventions.
      Online submission remains authoritative when available. For offline
      quizzes, fall back to a question-level "correct" / "answer" option id.
    */
    const totalQuestions = quiz.questions.length;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    const xpEarned = Math.round(
      (Math.max(0, quiz.xpReward || 0) * scorePercent) / 100,
    );

    return {
      scorePercent,
      correctAnswers,
      totalQuestions,
      xpEarned,
    };
  }, [answers, quiz]);

  const submitQuiz = useCallback(async () => {
    if (!quiz || quizState === "submitting" || quizState === "completed") {
      return;
    }

    setQuizState("submitting");

    try {
      if (quiz.source === "daily") {
        // Graded, rewarded and streak-counted on the server — the answer key
        // never reaches the browser, so there is no offline scoring for it.
        const response = await apiFetch("/api/student/daily-quiz/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers }),
        });

        const payload = (await response.json()) as DailySubmitResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || "Unable to submit today's quiz.");
        }

        const total = Math.max(payload.data.totalQuestions, 1);
        setResult({
          scorePercent: Math.round((payload.data.score / total) * 100),
          correctAnswers: payload.data.score,
          totalQuestions: payload.data.totalQuestions,
          xpEarned: payload.data.xpAwarded,
          synced: true,
        });
        setQuizState("completed");
        return;
      }

      if (isOnline && !offlineMode) {
        // The submit route takes the quiz id in the body; there is no
        // /api/student/quiz/<id>/submit route.
        const response = await apiFetch("/api/student/quiz/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quizId: quiz.id,
            lessonId: quiz.lessonId,
            answers,
          }),
        });

        const payload = (await response.json()) as SubmitResponse;

        if (response.ok && payload.success && payload.data) {
          setResult({
            scorePercent: payload.data.scorePercent,
            correctAnswers: payload.data.correctAnswers,
            totalQuestions: payload.data.totalQuestions,
            xpEarned: payload.data.xpEarned,
            synced: true,
          });
          setQuizState("completed");
          return;
        }
      }

      const offlineResult = calculateResult();

      if (!offlineResult) {
        throw new Error("Unable to calculate quiz result.");
      }

      const offlineResultStore = readJson<Record<string, unknown>>(
        "intellia360:offline:quiz-results:v1",
        {},
      );

      writeJson(
        "intellia360:offline:quiz-results:v1",
        {
          ...offlineResultStore,
          [quiz.id]: {
            ...offlineResult,
            topic: normalizeTopic(quiz.topic || quiz.questions[0]?.topic),
            completedAt: new Date().toISOString(),
            syncPending: true,
          },
        },
      );

      setResult({
        ...offlineResult,
        synced: false,
      });
      setQuizState("completed");
    } catch (submitError) {
      console.error("Quiz submit error:", submitError);

      if (quiz.source === "daily") {
        // Keep the answers so the student can submit again once connected. A
        // timer that already ran out gets a minute back, or the auto-submit
        // below would retry immediately.
        window.alert("Couldn't submit today's quiz. Check your connection and try again.");
        setSecondsLeft((seconds) => (seconds === 0 ? 60 : seconds));
        setQuizState("ready");
        return;
      }

      const offlineResult = calculateResult();

      if (!offlineResult) {
        setError("This quiz could not be submitted.");
        setQuizState("error");
        return;
      }

      setResult({
        ...offlineResult,
        synced: false,
      });
      setQuizState("completed");
    }
  }, [
    answers,
    calculateResult,
    isOnline,
    offlineMode,
    quiz,
    quizState,
  ]);

  /* Auto-submit when timer reaches zero. */
  useEffect(() => {
    if (quizState === "ready" && secondsLeft === 0 && quiz && quiz.questions.length > 0) {
      void submitQuiz();
    }
  }, [secondsLeft, quizState, quiz, submitQuiz]);

  const switchTopic = (topic: string) => {
    setOfflineMode(true);
    loadOfflineTopicQuiz(topic);
  };

  if (quizState === "loading") {
    return (
      <main className="student-quiz-page">
        <div className="quiz-loading">
          <div className="quiz-spinner" />
          <h2>Preparing your quiz...</h2>
          <p>Loading your topic mission.</p>
        </div>
      </main>
    );
  }

  if (quizState === "error" || !quiz) {
    return (
      <main className="student-quiz-page">
        <section className="quiz-error-card">
          <div className="quiz-error-icon">!</div>
          <h1>Quiz unavailable</h1>
          <p>{error || "We could not load this quiz."}</p>

          <div className="quiz-error-actions">
            <button
              type="button"
              className="quiz-primary-button"
              onClick={() => router.back()}
            >
              Go Back
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (quizState === "completed" && result) {
    return (
      <main className="student-quiz-page">
        <section className="quiz-result-page">
          <div className="result-badge">🏆</div>
          <p className="result-eyebrow">
            {result.synced ? "QUIZ COMPLETE" : "OFFLINE QUIZ COMPLETE"}
          </p>
          <h1>{result.scorePercent}%</h1>

          <p className="result-description">
            {result.synced
              ? "Your result has been saved to your student account."
              : "Your result is saved on this device and can be synced when you are online."}
          </p>

          <div className="result-score-ring" style={{ "--score": `${result.scorePercent}%` } as React.CSSProperties}>
            <div className="result-score-inner">
              <strong>{result.scorePercent}%</strong>
              <span>Score</span>
            </div>
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <span>Correct</span>
              <strong>{result.correctAnswers}</strong>
            </div>

            <div className="result-stat">
              <span>Questions</span>
              <strong>{result.totalQuestions}</strong>
            </div>

            <div className="result-stat">
              <span>XP Earned</span>
              <strong>{result.xpEarned}</strong>
            </div>
          </div>

          <div className="result-actions">
            {/* The daily quiz counts once per day, so it has nothing to retry. */}
            {quiz.source !== "daily" && (
              <button
                type="button"
                className="quiz-secondary-button"
                onClick={() => {
                  setAnswers({});
                  setCurrentQuestion(0);
                  setResult(null);
                  setSecondsLeft(quiz.durationSeconds || 0);
                  setQuizState("ready");
                }}
              >
                Retry Topic
              </button>
            )}

            <button
              type="button"
              className="quiz-primary-button"
              onClick={() => router.back()}
            >
              Back to Quiz Hub
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="student-quiz-page">
      <div className="quiz-shell">
        <header className="quiz-header">
          <div className="quiz-header-left">
            <button
              type="button"
              className="quiz-back-button"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              ←
            </button>

            <div>
              <span className="quiz-header-label">
                {offlineMode ? "OFFLINE TOPIC QUIZ" : "STUDENT QUIZ"}
              </span>
              <h1>{quiz.title}</h1>
              <p>
                {quiz.chapterTitle || quiz.lessonTitle}
                {quiz.topic ? ` • ${quiz.topic}` : ""}
              </p>
            </div>
          </div>

          <div className="quiz-header-stats">
            <div className="quiz-header-stat">
              <span>Mode</span>
              <strong>{offlineMode ? "Offline" : "Online"}</strong>
            </div>

            <div className={`quiz-timer ${secondsLeft <= 30 ? "is-warning" : ""}`}>
              <span>Time</span>
              <strong>{formattedTime}</strong>
            </div>
          </div>
        </header>

        <section className="quiz-topic-selector" aria-label="Offline quiz topics">
          <div>
            <span>TOPIC PRACTICE</span>
            <strong>Choose a saved topic</strong>
          </div>

          <select
            value={selectedTopic}
            onChange={(event) => switchTopic(event.target.value)}
            disabled={availableTopics.length === 0}
          >
            {availableTopics.length === 0 ? (
              <option value="">No offline topics saved</option>
            ) : (
              availableTopics.map((entry) => (
                <option key={entry.topic} value={entry.topic}>
                  {entry.topic}
                </option>
              ))
            )}
          </select>
        </section>

        <section className="quiz-offline-banner">
          <div>
            <strong>
              {offlineMode
                ? "Offline mode is active"
                : isOnline
                  ? "Online quiz ready"
                  : "You are offline"}
            </strong>
            <span>
              {offlineMode
                ? "Answers and results stay on this device."
                : "This topic is automatically saved for future offline practice."}
            </span>
          </div>

          <span className={`quiz-network-pill ${isOnline ? "online" : "offline"}`}>
            {isOnline ? "● Online" : "● Offline"}
          </span>
        </section>

        <section className="quiz-progress-section">
          <div className="quiz-progress-top">
            <span>
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            <strong>{progressPercent}% answered</strong>
          </div>

          <div className="quiz-progress-track">
            <div
              className="quiz-progress-fill"
              style={{
                width: `${((currentQuestion + 1) / Math.max(quiz.questions.length, 1)) * 100}%`,
              }}
            />
          </div>
        </section>

        <div className="quiz-content">
          <section className="quiz-main-card">
            <div className="question-meta">
              <div className="question-number">{currentQuestion + 1}</div>
              <span className="question-label">
                {current?.difficulty || quiz.difficulty || "Practice"}
              </span>
            </div>

            <h2 className="question-title">
              {current?.question || "Question unavailable"}
            </h2>

            <div className="quiz-options">
              {current?.options.map((option) => {
                const selected = answers[current.id] === option.id;

                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`quiz-option ${selected ? "is-selected" : ""}`}
                    onClick={() => handleAnswer(current.id, option.id)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + current.options.indexOf(option))}
                    </span>
                    <span className="option-text">{option.text}</span>
                    {selected && <span className="option-check">✓</span>}
                  </button>
                );
              })}
            </div>

            {showHint && (
              <div className="quiz-hint">
                <div className="quiz-hint-icon">?</div>
                <div>
                  <strong>Study tip</strong>
                  <p>
                    Read every option carefully, eliminate clearly incorrect choices,
                    then select the answer that best matches the lesson.
                  </p>
                </div>
                <button
                  type="button"
                  className="hint-close"
                  onClick={() => setShowHint(false)}
                  aria-label="Close hint"
                >
                  ×
                </button>
              </div>
            )}

            <div className="quiz-actions">
              <button
                type="button"
                className="hint-button"
                onClick={() => setShowHint((value) => !value)}
              >
                {showHint ? "Hide Hint" : "Need a Hint?"}
              </button>

              <div className="quiz-navigation">
                <button
                  type="button"
                  className="quiz-secondary-button"
                  disabled={currentQuestion === 0}
                  onClick={() =>
                    setCurrentQuestion((value) => Math.max(0, value - 1))
                  }
                >
                  Previous
                </button>

                {currentQuestion < quiz.questions.length - 1 ? (
                  <button
                    type="button"
                    className="quiz-primary-button"
                    onClick={() =>
                      setCurrentQuestion((value) =>
                        Math.min(quiz.questions.length - 1, value + 1),
                      )
                    }
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quiz-primary-button"
                    onClick={() => void submitQuiz()}
                    disabled={quizState === "submitting"}
                  >
                    {quizState === "submitting" ? "Submitting..." : "Finish Quiz"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="quiz-sidebar">
            <section className="quiz-map-card">
              <div className="quiz-map-header">
                <span>TOPIC QUEST MAP</span>
                <strong>{normalizeTopic(quiz.topic || current?.topic)}</strong>
              </div>

              <div className="quiz-question-map">
                {quiz.questions.map((question, index) => {
                  const answered = Boolean(answers[question.id]);
                  const currentQuestionClass =
                    index === currentQuestion ? "is-current" : "";

                  return (
                    <button
                      type="button"
                      key={question.id}
                      className={`question-map-item ${currentQuestionClass} ${answered ? "is-answered" : ""
                        }`}
                      onClick={() => setCurrentQuestion(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="quiz-map-legend">
                <span>
                  <i className="legend-dot current" />
                  Current
                </span>
                <span>
                  <i className="legend-dot answered" />
                  Answered
                </span>
                <span>
                  <i className="legend-dot" />
                  Unanswered
                </span>
              </div>
            </section>

            <section className="quiz-motivation-card">
              <div className="motivation-icon">⚡</div>
              <h3>Keep your streak alive</h3>
              <p>
                Complete this topic quiz and keep building your learning progress.
              </p>

              <div className="motivation-progress">
                <div style={{ width: `${progressPercent}%` }} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
