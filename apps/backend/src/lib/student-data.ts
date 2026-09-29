/**
 * student-data.ts
 *
 * Centralized data access layer for the student dashboard.
 * All data is loaded from grade-scoped JSON files.
 */

import type {
  GradeCurriculum,
  DashboardConfig,
  DashboardHeroSlide,
  GradeActionCard,
  CurriculumTopicGrade,
  LessonMetadata,
} from "@intellia360/shared/types/student";

// ─── Current Grade ─────────────────────────────────────────────────────────

export const CURRENT_GRADE = "grade1" as const;

// ─── Static Imports ────────────────────────────────────────────────────────

import grade1Curriculum from "@/data/grades/grade1/curriculum.json";
import grade1Dashboard from "@/data/grades/grade1/dashboard.json";

import grade1Counting100 from "@/data/grades/grade1/lessons/counting-up-to-100.json";
import grade1ReadingWriting from "@/data/grades/grade1/lessons/reading-writing-numbers.json";
import grade1PlaceValueTens from "@/data/grades/grade1/lessons/place-value-tens-and-ones.json";
import grade1ComparingOrdering from "@/data/grades/grade1/lessons/comparing-and-ordering-numbers.json";
import grade1NumberPatterns from "@/data/grades/grade1/lessons/number-patterns.json";
import grade1OrdinalNumbers from "@/data/grades/grade1/lessons/ordinal-numbers.json";
import grade1TestSeries from "@/data/grades/grade1/lessons/numbers-and-counting-test-series.json";

import grade2Curriculum from "@/data/grades/grade2/curriculum.json";
import grade2Dashboard from "@/data/grades/grade2/dashboard.json";
import grade2LessonPlaceValue from "@/data/grades/grade2/lessons/place-value-hundreds-tens-ones.json";

// ─── Grade Maps ────────────────────────────────────────────────────────────

const GRADE_CURRICULUM_MAP: Record<string, GradeCurriculum> = {
  grade1: grade1Curriculum as unknown as GradeCurriculum,
  grade2: grade2Curriculum as unknown as GradeCurriculum,
};

const GRADE_DASHBOARD_MAP: Record<string, DashboardConfig> = {
  grade1: grade1Dashboard as DashboardConfig,
  grade2: grade2Dashboard as DashboardConfig,
};

// ─── Lesson Metadata ──────────────────────────────────────────────────────

const LESSON_METADATA_MAP: Record<
  string,
  Record<string, LessonMetadata>
> = {
  grade1: {
    /*
     * IMPORTANT:
     * Curriculum lesson ID is:
     * counting-numbers-up-to-100
     */
    "counting-numbers-up-to-100":
      grade1Counting100 as LessonMetadata,

    "reading-writing-numbers":
      grade1ReadingWriting as LessonMetadata,

    "place-value-tens-and-ones":
      grade1PlaceValueTens as LessonMetadata,

    "comparing-and-ordering-numbers":
      grade1ComparingOrdering as LessonMetadata,

    "number-patterns":
      grade1NumberPatterns as LessonMetadata,

    "ordinal-numbers":
      grade1OrdinalNumbers as LessonMetadata,

    "numbers-and-counting-test-series":
      grade1TestSeries as LessonMetadata,
  },

  grade2: {
    "place-value-hundreds-tens-ones":
      grade2LessonPlaceValue as LessonMetadata,
  },
};

// ─── Module → Card Mapping ────────────────────────────────────────────────

const MODULE_TO_CARD_MAP: Record<string, string> = {
  eduNotes: "card_edunotes",
  architectureModule: "card_architecture",
  videoLesson: "card_video",
  practiceModule: "card_practice",
};



// ─── Curriculum ───────────────────────────────────────────────────────────

export function getCurriculum(
  grade: string = CURRENT_GRADE
): GradeCurriculum {
  const data = GRADE_CURRICULUM_MAP[grade];

  if (!data) {
    throw new Error(
      `No curriculum data found for grade: ${grade}`
    );
  }

  return data;
}

// ─── All Lessons ──────────────────────────────────────────────────────────

export function getAllLessonsOrdered(
  grade: string = CURRENT_GRADE
): CurriculumTopicGrade[] {
  const curriculum = getCurriculum(grade);

  return curriculum.chapters.flatMap(
    (chapter) => chapter.topics
  );
}

// ─── Previous / Next Lesson ───────────────────────────────────────────────

export function getPrevNextLesson(
  lessonId: string,
  grade: string = CURRENT_GRADE
): {
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
} {
  const lessons = getAllLessonsOrdered(grade);

  const currentIndex = lessons.findIndex(
    (lesson) =>
      (lesson.lessonId ?? lesson.id) === lessonId
  );

  if (currentIndex === -1) {
    return {
      previous: null,
      next: null,
    };
  }

  const prev =
    currentIndex > 0
      ? lessons[currentIndex - 1]
      : null;

  const next =
    currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

  return {
    previous: prev
      ? {
        id: prev.lessonId ?? prev.id,
        title: prev.title,
      }
      : null,

    next: next
      ? {
        id: next.lessonId ?? next.id,
        title: next.title,
      }
      : null,
  };
}

// ─── Lesson Metadata ──────────────────────────────────────────────────────

export function getLessonMetadata(
  lessonId: string,
  grade: string = CURRENT_GRADE
): LessonMetadata | null {
  const gradeLessons = LESSON_METADATA_MAP[grade];

  if (!gradeLessons) {
    return null;
  }

  return gradeLessons[lessonId] ?? null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export function getDashboardConfig(
  grade: string = CURRENT_GRADE
): DashboardConfig {
  const data = GRADE_DASHBOARD_MAP[grade];

  if (!data) {
    throw new Error(
      `No dashboard data found for grade: ${grade}`
    );
  }

  return data;
}

// ─── Hero ─────────────────────────────────────────────────────────────────

export function getResolvedHeroSlide(
  activeLessonId: string,
  grade: string = CURRENT_GRADE
): DashboardHeroSlide {
  const dashboard = getDashboardConfig(grade);

  const lesson = getLessonMetadata(
    activeLessonId,
    grade
  );

  if (!lesson) {
    return dashboard.heroSlide;
  }

  return {
    ...dashboard.heroSlide,

    lessonId: activeLessonId,

    title: lesson.title,

    subtitle: lesson.description,

    visualizerKey:
      lesson.heroVisualizer,

    visualizerData:
      lesson.heroVisualizerData,
  };
}

// ─── Action Cards ─────────────────────────────────────────────────────────

export function getResolvedActionCards(
  activeLessonId: string,
  grade: string = CURRENT_GRADE
): GradeActionCard[] {
  const dashboard = getDashboardConfig(grade);
  const lesson = getLessonMetadata(
    activeLessonId,
    grade
  );

  return dashboard.actionCards.map((card) => {
    let enabled = card.enabled;
    let targetUrl = card.targetUrl;

    if (lesson) {
      const moduleKey = Object.entries(
        MODULE_TO_CARD_MAP
      ).find(
        ([, cardId]) =>
          cardId === card.id
      )?.[0] as
        | keyof typeof lesson.modules
        | undefined;

      if (moduleKey && lesson.modules[moduleKey]) {
        const moduleConfig = lesson.modules[moduleKey];
        enabled = moduleConfig.enabled;
        targetUrl = moduleConfig.url || card.targetUrl;
      }
    }

    // ────────────────────────────────────
    // EduNotes
    // ────────────────────────────────────
    if (card.id === "card_edunotes") {
      targetUrl = `/student/lesson/edunotes?lessonId=${encodeURIComponent(
        activeLessonId
      )}`;
      console.log("EduNotes card target:", targetUrl);
      console.log("Active lesson:", activeLessonId);
    }

    return {
      ...card,
      enabled,
      targetUrl,
    };
  });
}

// ─── Resolved Previous / Next ─────────────────────────────────────────────

export function getResolvedPrevNext(
  activeLessonId: string,
  grade: string = CURRENT_GRADE
): {
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
} {
  const lesson = getLessonMetadata(
    activeLessonId,
    grade
  );

  if (lesson) {
    return {
      previous:
        lesson.previousLesson,

      next:
        lesson.nextLesson,
    };
  }

  return getPrevNextLesson(
    activeLessonId,
    grade
  );
}