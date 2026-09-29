"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useStudent } from "@/context/StudentContext";
import LessonResourceNav from "@/components/student/LessonResourceNav";
import "@/styles/lesson-resources.css";
import { apiFetch, apiUrl } from "@/lib/api";

/*
 * react-pdf uses browser APIs such as DOMMatrix.
 * Therefore EduNotesBookViewer must be loaded client-side only.
 */
const EduNotesBookViewer = dynamic(
  () => import("@/components/student/EduNotesBookViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="edunotes-state">
        <div className="edunotes-loader">📚</div>

        <h2>Opening your learning book...</h2>

        <p>Preparing your EduNotes ✨</p>
      </div>
    ),
  }
);

function EduNotesContent() {
  const searchParams = useSearchParams();

  const lessonIdParam = searchParams.get("lessonId");
  const gradeParam = searchParams.get("grade");

  const { currentGrade, gradeReady } = useStudent();

  // The grade in the link, otherwise the student's grade once their profile
  // has loaded — reading it earlier briefly checked the default grade's notes.
  const effectiveGrade =
    gradeParam || (gradeReady ? currentGrade || "grade1" : "");

  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lessonIdParam) {
      setLoading(false);
      setAvailable(false);
      return;
    }

    // The loading state stays up until the student's grade is known.
    if (!effectiveGrade) return;

    const lessonId = lessonIdParam;
    let cancelled = false;

    async function checkEduNotes() {
      try {
        setLoading(true);
        setError(false);

        const url =
          `/api/student/edunotes` +
          `?lessonId=${encodeURIComponent(lessonId)}` +
          `&grade=${encodeURIComponent(effectiveGrade)}`;

        const response = await apiFetch(url, {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.ok) {
          setAvailable(true);
        } else if (response.status === 404) {
          setAvailable(false);
        } else {
          console.error(
            "EduNotes metadata error:",
            response.status
          );

          setAvailable(false);
          setError(true);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "EduNotes metadata error:",
          err
        );

        setAvailable(false);
        setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkEduNotes();

    return () => {
      cancelled = true;
    };
  }, [lessonIdParam, effectiveGrade]);

  /* -----------------------------
     Loading
  ----------------------------- */

  if (loading) {
    return (
      <div className="edunotes-state">
        <div className="edunotes-loader">📚</div>

        <h2>Opening your learning book...</h2>

        <p>Getting your EduNotes ready ✨</p>
      </div>
    );
  }

  /* -----------------------------
     Missing lesson
  ----------------------------- */

  if (!lessonIdParam) {
    return (
      <div className="edunotes-state">
        <div className="edunotes-state-icon">
          📖
        </div>

        <h2>Lesson ID is missing</h2>

        <p>
          Please select a lesson to view
          its EduNotes.
        </p>
      </div>
    );
  }

  /* -----------------------------
     API error
  ----------------------------- */

  if (error) {
    return (
      <div className="edunotes-state">
        <div className="edunotes-state-icon">
          😕
        </div>

        <h2>Unable to load EduNotes</h2>

        <p>
          Something went wrong while
          loading your learning book.
        </p>

        <button
          type="button"
          className="edunotes-retry-button"
          onClick={() =>
            window.location.reload()
          }
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  /* -----------------------------
     EduNotes unavailable
  ----------------------------- */

  if (!available) {
    return (
      <div className="edunotes-state">
        <div className="edunotes-state-icon">
          📚
        </div>

        <h2>EduNotes not available</h2>

        <p>
          Notes for this lesson are not
          available yet.
        </p>

        <LessonResourceNav
          lessonId={lessonIdParam}
          grade={effectiveGrade}
          active="edunotes"
        />
      </div>
    );
  }

  const lessonId = lessonIdParam;

  /* -----------------------------
     PDF URL
  ----------------------------- */

  const pdfUrl = apiUrl(
    `/api/student/edunotes/content` +
    `?lessonId=${encodeURIComponent(lessonId)}` +
    `&grade=${encodeURIComponent(effectiveGrade)}`);

  return (
    <div className="edunotes-page-wrapper">
      <div className="edunotes-resource-bar">
        <LessonResourceNav
          lessonId={lessonId}
          grade={effectiveGrade}
          active="edunotes"
        />
      </div>

      <EduNotesBookViewer
        pdfUrl={pdfUrl}
        lessonId={lessonId}
      />
    </div>
  );
}

export default function EduNotesPage() {
  return (
    <Suspense
      fallback={
        <div className="edunotes-state">
          <div className="edunotes-loader">
            📚
          </div>

          <h2>Loading EduNotes...</h2>

          <p>Preparing your learning book ✨</p>
        </div>
      }
    >
      <EduNotesContent />
    </Suspense>
  );
}
