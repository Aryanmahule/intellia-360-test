"use client";

import Link from "next/link";

/**
 * Topic-wise resource switcher shown on every lesson screen.
 *
 * Every button opens the lesson screen (/student/lesson/[id]) with the module
 * in ?module=, so Architecture, Videos and EduNotes all render inside the one
 * lesson page for the same lessonId (and grade when known). They used to open
 * separate routes.
 */

export type LessonResourceKey = "lesson" | "video" | "edunotes";

interface LessonResourceNavProps {
  lessonId?: string | null;
  grade?: string | null;
  active: LessonResourceKey;
}

interface ResourceItem {
  key: LessonResourceKey;
  icon: string;
  label: string;
  href: string;
}

export default function LessonResourceNav({
  lessonId,
  grade,
  active,
}: LessonResourceNavProps) {
  const moduleHref = (key: LessonResourceKey) => {
    const params = new URLSearchParams();
    if (key !== "lesson") params.set("module", key);
    if (grade) params.set("grade", grade);
    const query = params.toString();
    return `/student/lesson/${encodeURIComponent(lessonId ?? "")}${query ? `?${query}` : ""}`;
  };

  const items: ResourceItem[] = [
    {
      key: "lesson",
      icon: "🧩",
      label: "Lesson",
      href: moduleHref("lesson"),
    },
    {
      key: "video",
      icon: "🎬",
      label: "Videos",
      href: moduleHref("video"),
    },
    {
      key: "edunotes",
      icon: "📘",
      label: "EduNotes",
      href: moduleHref("edunotes"),
    },
  ];

  return (
    <nav className="lesson-resource-nav" aria-label="Lesson resources">
      {items.map((item) => {
        const className = `lesson-resource-btn is-${item.key}${
          item.key === active ? " is-active" : ""
        }`;

        // Without a lesson there is nothing topic-wise to open.
        if (!lessonId) {
          return (
            <span
              key={item.key}
              className={`${className} is-disabled`}
              aria-disabled="true"
              title="Open a lesson first"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className={className}
            aria-current={item.key === active ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
