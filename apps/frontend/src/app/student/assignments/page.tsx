"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudentContext } from "@/context/StudentContext";
import "./assignments.css";
import { apiFetch } from "@/lib/api";

type AssignmentStatus =
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "OVERDUE";

interface StudentAssignment {
    id: string;
    title: string;
    description: string | null;
    subject: string | null;
    lessonId: string | null;
    lessonTitle: string | null;
    teacherName: string | null;
    assignedAt: string;
    dueDate: string | null;
    status: AssignmentStatus;
    totalQuestions: number;
    completedQuestions: number;
    points: number;
}

interface AssignmentResponse {
    assignments: StudentAssignment[];
}

type FilterType = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

const STATUS_LABELS: Record<AssignmentStatus, string> = {
    PENDING: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    OVERDUE: "Overdue",
};

/**
 * Where an assignment's button leads. There is no assignment detail route —
 * the old links to /student/assignments/<id> were 404s — so an assignment
 * opens the lesson it is attached to, or that lesson's practice quiz when the
 * teacher set it as a quiz (the API reports the assignment type as `subject`).
 * An assignment without a lesson has nothing to open in the app.
 */
function assignmentHref(
    assignment: StudentAssignment,
    topics: { id: string }[],
): string | null {
    if (!assignment.lessonId) return null;
    if (assignment.subject === "Quiz") {
        return `/student/quiz/practice-${encodeURIComponent(assignment.lessonId)}`;
    }
    return `/student/lesson/${encodeURIComponent(curriculumTopicId(assignment.lessonId, topics))}`;
}

/**
 * Lesson files (which assignments and quizzes reference) and the curriculum use
 * different ids for some lessons: counting-up-to-100 vs
 * counting-numbers-up-to-100, ordinal-numbers vs
 * ordinal-numbers-first-second-third. An exact id wins; otherwise the topic
 * whose id contains the lesson id words in order is used, but only when exactly
 * one topic matches.
 */
function curriculumTopicId(lessonId: string, topics: { id: string }[]): string {
    if (topics.some((t) => t.id === lessonId)) return lessonId;
    const words = lessonId.split("-");
    const matches = topics.filter((t) => {
        let matched = 0;
        for (const part of t.id.split("-")) {
            if (part === words[matched]) matched += 1;
        }
        return matched === words.length;
    });
    return matches.length === 1 ? matches[0].id : lessonId;
}

function ClipboardIcon() {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 4V3h6v1" />
            <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
    );
}

function TeacherIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
    );
}

function TrophyIcon() {
    return (
        <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
            <path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4" />
            <path d="M12 13v4M8.5 20h7M10 17h4" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

function formatDate(date: string | null): string {
    if (!date) return "No due date";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "No due date";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getProgress(assignment: StudentAssignment): number {
    if (assignment.totalQuestions <= 0) return 0;

    return Math.min(
        100,
        Math.round(
            (assignment.completedQuestions / assignment.totalQuestions) * 100,
        ),
    );
}

function getEffectiveStatus(
    assignment: StudentAssignment,
): AssignmentStatus {
    if (
        assignment.status !== "COMPLETED" &&
        assignment.dueDate &&
        new Date(assignment.dueDate).getTime() < Date.now()
    ) {
        return "OVERDUE";
    }

    return assignment.status;
}

export default function StudentAssignmentsPage() {
    const { curriculum } = useStudentContext();
    const topics = useMemo(
        () => curriculum?.chapters.flatMap((chapter) => chapter.topics) ?? [],
        [curriculum],
    );
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch("/api/student/assignments", {
                method: "GET",
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Unable to load assignments.");
            }

            const data = (await response.json()) as AssignmentResponse;

            setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
        } catch (requestError) {
            console.error("Student assignments error:", requestError);
            setAssignments([]);
            setError("Assignments could not be loaded right now.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAssignments();
    }, [loadAssignments]);

    const statistics = useMemo(() => {
        const pending = assignments.filter((assignment) => {
            const status = getEffectiveStatus(assignment);
            return status === "PENDING" || status === "OVERDUE";
        }).length;

        const inProgress = assignments.filter(
            (assignment) => getEffectiveStatus(assignment) === "IN_PROGRESS",
        ).length;

        const completed = assignments.filter(
            (assignment) => getEffectiveStatus(assignment) === "COMPLETED",
        ).length;

        return {
            total: assignments.length,
            pending,
            inProgress,
            completed,
        };
    }, [assignments]);

    const filteredAssignments = useMemo(() => {
        if (activeFilter === "ALL") {
            return assignments;
        }

        return assignments.filter((assignment) => {
            const status = getEffectiveStatus(assignment);

            if (activeFilter === "PENDING") {
                return status === "PENDING" || status === "OVERDUE";
            }

            return status === activeFilter;
        });
    }, [activeFilter, assignments]);

    return (
        <main className="student-assignments-page">
            <section className="student-assignments-shell">
                <header className="student-assignments-header">
                    <div>
                        <span className="student-assignments-eyebrow">
                            YOUR LEARNING TASKS
                        </span>

                        <h1>Assignments</h1>

                        <p>
                            Complete the tasks assigned to you by your teacher and earn
                            progress along the way.
                        </p>
                    </div>

                    <div className="student-assignment-header-icon">
                        <ClipboardIcon />
                    </div>
                </header>

                <section className="student-assignment-stats">
                    <div className="assignment-stat-card">
                        <span className="assignment-stat-label">Total</span>
                        <strong>{statistics.total}</strong>
                        <span className="assignment-stat-description">
                            Assigned tasks
                        </span>
                    </div>

                    <div className="assignment-stat-card">
                        <span className="assignment-stat-label">Pending</span>
                        <strong>{statistics.pending}</strong>
                        <span className="assignment-stat-description">
                            Need attention
                        </span>
                    </div>

                    <div className="assignment-stat-card">
                        <span className="assignment-stat-label">In Progress</span>
                        <strong>{statistics.inProgress}</strong>
                        <span className="assignment-stat-description">
                            Currently working
                        </span>
                    </div>

                    <div className="assignment-stat-card">
                        <span className="assignment-stat-label">Completed</span>
                        <strong>{statistics.completed}</strong>
                        <span className="assignment-stat-description">
                            Finished tasks
                        </span>
                    </div>
                </section>

                <section className="student-assignments-toolbar">
                    <div>
                        <h2>Your Assignments</h2>
                        <span>
                            {statistics.total === 0
                                ? "No tasks assigned yet"
                                : `${statistics.total} teacher-assigned task${statistics.total === 1 ? "" : "s"
                                }`}
                        </span>
                    </div>

                    <div className="assignment-filters" role="tablist">
                        {(
                            [
                                ["ALL", "All"],
                                ["PENDING", "Pending"],
                                ["IN_PROGRESS", "In Progress"],
                                ["COMPLETED", "Completed"],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={activeFilter === value}
                                className={
                                    activeFilter === value
                                        ? "assignment-filter active"
                                        : "assignment-filter"
                                }
                                onClick={() => setActiveFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {loading && (
                    <section className="assignment-loading-grid">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                className="assignment-skeleton-card"
                                key={`skeleton-${index}`}
                            >
                                <div className="skeleton-line large" />
                                <div className="skeleton-line" />
                                <div className="skeleton-line short" />
                                <div className="skeleton-progress" />
                            </div>
                        ))}
                    </section>
                )}

                {!loading && error && (
                    <section className="assignment-message-card error">
                        <div className="assignment-message-icon">
                            <ClipboardIcon />
                        </div>

                        <h2>Unable to load assignments</h2>

                        <p>{error}</p>

                        <button
                            type="button"
                            className="assignment-primary-button"
                            onClick={() => void loadAssignments()}
                        >
                            Try Again
                        </button>
                    </section>
                )}

                {!loading && !error && assignments.length === 0 && (
                    <section className="assignment-message-card">
                        <div className="assignment-message-icon">
                            <ClipboardIcon />
                        </div>

                        <span className="assignment-message-kicker">
                            NOTHING ASSIGNED YET
                        </span>

                        <h2>No Assignments Yet</h2>

                        <p>
                            Your teacher has not assigned any tasks to you yet. New
                            assignments will appear here automatically when your teacher
                            assigns them.
                        </p>

                        <div className="assignment-empty-note">
                            Your curriculum lessons will not appear here unless your teacher
                            assigns them.
                        </div>
                    </section>
                )}

                {!loading &&
                    !error &&
                    assignments.length > 0 &&
                    filteredAssignments.length === 0 && (
                        <section className="assignment-message-card compact">
                            <h2>No {activeFilter.toLowerCase()} assignments</h2>
                            <p>Try another filter to view your assigned tasks.</p>
                        </section>
                    )}

                {!loading && !error && filteredAssignments.length > 0 && (
                    <section className="student-assignment-list">
                        {filteredAssignments.map((assignment) => {
                            const status = getEffectiveStatus(assignment);
                            const progress = getProgress(assignment);
                            const actionHref = assignmentHref(assignment, topics);

                            return (
                                <article
                                    className={`student-assignment-card status-${status.toLowerCase()}`}
                                    key={assignment.id}
                                >
                                    <div className="assignment-card-top">
                                        <div className="assignment-type-icon">
                                            <ClipboardIcon />
                                        </div>

                                        <div className="assignment-card-heading">
                                            <span className="assignment-subject">
                                                {assignment.subject || "Learning Assignment"}
                                            </span>

                                            <h3>{assignment.title}</h3>

                                            {assignment.description && (
                                                <p>{assignment.description}</p>
                                            )}
                                        </div>

                                        <span className={`assignment-status ${status.toLowerCase()}`}>
                                            {STATUS_LABELS[status]}
                                        </span>
                                    </div>

                                    <div className="assignment-meta">
                                        {assignment.teacherName && (
                                            <span>
                                                <TeacherIcon />
                                                {assignment.teacherName}
                                            </span>
                                        )}

                                        {assignment.lessonTitle && (
                                            <span>
                                                <ClipboardIcon />
                                                {assignment.lessonTitle}
                                            </span>
                                        )}

                                        <span>
                                            <CalendarIcon />
                                            {assignment.dueDate
                                                ? `Due ${formatDate(assignment.dueDate)}`
                                                : "No due date"}
                                        </span>
                                    </div>

                                    <div className="assignment-progress-section">
                                        <div className="assignment-progress-header">
                                            <span>Task Progress</span>
                                            <strong>{progress}%</strong>
                                        </div>

                                        <div className="assignment-progress-track">
                                            <div
                                                className="assignment-progress-value"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="assignment-progress-footer">
                                            <span>
                                                {assignment.completedQuestions} of{" "}
                                                {assignment.totalQuestions} questions
                                            </span>

                                            <span>
                                                {assignment.points > 0
                                                    ? `${assignment.points} XP available`
                                                    : "Keep learning"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="assignment-card-footer">
                                        <div className="assignment-reward">
                                            <TrophyIcon />

                                            <span>
                                                {assignment.points > 0
                                                    ? `${assignment.points} XP`
                                                    : "Learning reward"}
                                            </span>
                                        </div>

                                        {!actionHref ? (
                                            <span
                                                className="assignment-secondary-button"
                                                aria-disabled="true"
                                                title="This assignment isn't linked to a lesson — your teacher will share the material"
                                                style={{ cursor: "default", opacity: 0.75 }}
                                            >
                                                From your teacher
                                            </span>
                                        ) : assignment.status === "COMPLETED" ? (
                                            <Link
                                                href={actionHref}
                                                className="assignment-secondary-button"
                                            >
                                                Review
                                                <ArrowIcon />
                                            </Link>
                                        ) : (
                                            <Link
                                                href={actionHref}
                                                className="assignment-primary-button"
                                            >
                                                {assignment.status === "IN_PROGRESS"
                                                    ? "Continue"
                                                    : "Start Assignment"}
                                                <ArrowIcon />
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </section>
        </main>
    );
}