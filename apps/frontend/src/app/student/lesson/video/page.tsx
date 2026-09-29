"use client";

/*
 * ============================================================
 * LESSON VIDEOS  —  /student/lesson/video?lessonId=...&grade=...
 * ============================================================
 *
 * Topic-wise videos for the lesson the student is on. The lesson is read
 * from the query string (this route has no dynamic segment), the same way
 * the EduNotes page reads it, and the list comes from /api/student/videos.
 */

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStudent } from "@/context/StudentContext";
import LessonResourceNav from "@/components/student/LessonResourceNav";
import "@/styles/lesson-resources.css";
import { apiFetch } from "@/lib/api";

interface LessonVideo {
  videoId: string;
  title: string;
  description?: string;
  durationLabel?: string;
}

type LoadState = "loading" | "ready" | "error";

function StateCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="lesson-video-state">
      <div className="lesson-video-state-card">
        <div className="lesson-video-state-icon" aria-hidden="true">
          {icon}
        </div>

        <h2>{title}</h2>

        {children}
      </div>
    </div>
  );
}

function LessonVideoContent() {
  const searchParams = useSearchParams();

  const lessonIdParam = searchParams.get("lessonId");
  const gradeParam = searchParams.get("grade");
  const videoIdParam = searchParams.get("videoId");

  const { currentGrade, gradeReady, curriculum } = useStudent();

  // The grade in the link, otherwise the student's grade once their profile
  // has loaded — reading it earlier briefly loaded the default grade's videos.
  const effectiveGrade =
    gradeParam || (gradeReady ? currentGrade || "grade1" : "");

  const [state, setState] = useState<LoadState>("loading");
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [selected, setSelected] = useState(0);

  const lessonTitle =
    curriculum?.chapters
      .flatMap((chapter) => chapter.topics)
      .find((topic) => topic.id === lessonIdParam)?.title ?? lessonIdParam;

  useEffect(() => {
    // Without a lesson the page renders its own notice below, so there is
    // nothing to load and no state to change here. Without a grade yet, the
    // loading state stays up until the student's profile arrives.
    if (!lessonIdParam || !effectiveGrade) return;

    let cancelled = false;

    async function loadVideos(lessonId: string) {
      try {
        const url =
          "/api/student/videos" +
          "?lessonId=" + encodeURIComponent(lessonId) +
          "&grade=" + encodeURIComponent(effectiveGrade);

        const response = await apiFetch(url, { cache: "no-store" });

        if (cancelled) return;

        if (!response.ok) {
          setState("error");
          return;
        }

        const data = await response.json();

        if (cancelled) return;

        const list: LessonVideo[] = Array.isArray(data?.videos)
          ? data.videos
          : [];

        const startIndex = videoIdParam
          ? list.findIndex((video) => video.videoId === videoIdParam)
          : 0;

        setVideos(list);
        setSelected(startIndex > 0 ? startIndex : 0);
        setState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Lesson videos error:", error);
        setState("error");
      }
    }

    loadVideos(lessonIdParam);

    return () => {
      cancelled = true;
    };
  }, [lessonIdParam, effectiveGrade, videoIdParam]);

  /* ---------- No lesson in the URL ---------- */

  if (!lessonIdParam) {
    return (
      <main className="lesson-video-page">
        <div className="lesson-video-shell">
          <StateCard icon="🎬" title="Lesson ID is missing">
            <p>
              Open a lesson first — its Videos button carries the topic across.
            </p>

            <div className="lesson-resource-nav">
              <Link href="/student/courses" className="lesson-resource-btn">
                <span aria-hidden="true">📚</span>
                Browse my courses
              </Link>
            </div>
          </StateCard>
        </div>
      </main>
    );
  }

  const activeVideo = videos[selected];

  return (
    <main className="lesson-video-page">
      <div className="lesson-video-shell">

        <header className="lesson-video-header">
          <h1>Lesson Videos</h1>

          <p>
            Current Lesson: <strong>{lessonTitle}</strong>
          </p>

          <LessonResourceNav
            lessonId={lessonIdParam}
            grade={effectiveGrade}
            active="video"
          />
        </header>

        {state === "loading" && (
          <StateCard icon="🎬" title="Loading videos…">
            <p>Fetching the videos for this topic.</p>
          </StateCard>
        )}

        {state === "error" && (
          <StateCard icon="😕" title="Unable to load videos">
            <p>Something went wrong while loading the videos for this topic.</p>

            <button
              type="button"
              className="edunotes-retry-button"
              onClick={() => window.location.reload()}
            >
              🔄 Try Again
            </button>
          </StateCard>
        )}

        {state === "ready" && videos.length === 0 && (
          <StateCard icon="🎬" title="Videos coming soon">
            <p>
              No videos are published for this topic yet. The EduNotes book and
              the interactive lesson are ready to use in the meantime.
            </p>

            <LessonResourceNav
              lessonId={lessonIdParam}
              grade={effectiveGrade}
              active="video"
            />
          </StateCard>
        )}

        {state === "ready" && activeVideo && (
          <div className="lesson-video-layout">

            <section className="lesson-video-main" aria-label="Video player">
              <div className="lesson-video-frame">
                <iframe
                  key={activeVideo.videoId}
                  src={
                    "https://www.youtube-nocookie.com/embed/" +
                    activeVideo.videoId +
                    "?rel=0"
                  }
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>

              <div className="lesson-video-caption">
                <h2>{activeVideo.title}</h2>

                {activeVideo.description && <p>{activeVideo.description}</p>}
              </div>
            </section>

            {videos.length > 1 && (
              <aside
                className="lesson-video-side"
                aria-label="Videos in this topic"
              >
                <h3>In this topic</h3>

                <ul className="lesson-video-list">
                  {videos.map((video, index) => (
                    <li key={video.videoId}>
                      <button
                        type="button"
                        className={
                          "lesson-video-item" +
                          (index === selected ? " is-active" : "")
                        }
                        aria-current={index === selected ? "true" : undefined}
                        onClick={() => setSelected(index)}
                      >
                        <span
                          className="lesson-video-item-index"
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>

                        <span className="lesson-video-item-body">
                          <strong>{video.title}</strong>
                          {video.durationLabel && (
                            <small>{video.durationLabel}</small>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LessonVideoPage() {
  return (
    <Suspense
      fallback={
        <main className="lesson-video-page">
          <div className="lesson-video-shell">
            <StateCard icon="🎬" title="Loading videos…">
              <p>Preparing the videos for this topic.</p>
            </StateCard>
          </div>
        </main>
      }
    >
      <LessonVideoContent />
    </Suspense>
  );
}
