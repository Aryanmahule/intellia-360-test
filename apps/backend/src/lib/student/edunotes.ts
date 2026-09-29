/**
 * edunotes.ts
 *
 * Centralized server-side EduNotes registry for mapping lesson IDs
 * to Google Drive files per grade.
 */

export interface EduNotesItem {
  lessonId: string;
  fileId: string;
  fileName: string;
  previewUrl: string;
}

export interface EduNotesConfig {
  fileId: string;
  fileName: string;
}

/**
 * Registry of EduNotes Google Drive file IDs keyed by grade and lessonId.
 *
 * IMPORTANT:
 * lessonId must exactly match the lessonId used in curriculum.json.
 */
export const EDUNOTES_REGISTRY: Record<
  string,
  Record<string, EduNotesConfig>
> = {
  // ============================================================
  // GRADE 1
  // ============================================================
  grade1: {
    // 1. Counting Numbers up to 100
    "counting-numbers-up-to-100": {
      fileId: "10nQ9gQodtc3CBO1rPclGIoEkoVNFPsK_",
      fileName: "Counting numbers up to 100.pdf",
    },

    // 2. Reading and Writing Numbers
    "reading-writing-numbers": {
      fileId: "19XytCZzrIiKjGio-A6x5QDt9XR3DjF_U",
      fileName: "Reading and Writing Numbers.pdf",
    },

    // 3. Place Value (Tens and Ones)
    "place-value-tens-and-ones": {
      fileId: "1kfart5O9nVWqlr73GaW1uqeupC01TcsD",
      fileName: "Place Value (Tens and Ones).pdf",
    },

    // 4. Comparing and Ordering Numbers
    "comparing-and-ordering-numbers": {
      fileId: "15P4E-E4e5Zmg0i3vXv9O9V1krKDJQIQK",
      fileName: "Comparing and Ordering Numbers.pdf",
    },

    // 5. Number Patterns
    "number-patterns": {
      fileId: "1HxAvWjbVDDw2Jm_1mpKDyKXsbdl0FBJU",
      fileName: "Number Patterns.pdf",
    },

    // 6. Ordinal Numbers
    "ordinal-numbers": {
      fileId: "1WTLNo1jwpxzo8HtHbP5RJXmNBL38CnMg",
      fileName: "Ordinal Numbers.pdf",
    },

    // 7. Numbers and Counting Test Series
    // Add its Google Drive ID when available.
  },

  // ============================================================
  // GRADE 2
  // ============================================================
  grade2: {
    // Add Grade 2 EduNotes here when available.
  },
};

/**
 * Returns EduNotes item for a given lessonId and grade.
 *
 * Dynamically builds the Google Drive preview URL from the
 * stored fileId.
 */
export function getEduNotes(
  lessonId: string,
  grade: string = "grade1"
): EduNotesItem | null {
  if (!lessonId) {
    return null;
  }

  const normalizedGrade = grade.toLowerCase();

  const gradeData = EDUNOTES_REGISTRY[normalizedGrade];

  if (!gradeData) {
    return null;
  }

  const noteConfig = gradeData[lessonId];

  if (!noteConfig || !noteConfig.fileId) {
    return null;
  }

  return {
    lessonId,
    fileId: noteConfig.fileId,
    fileName: noteConfig.fileName,
    previewUrl: `https://drive.google.com/file/d/${noteConfig.fileId}/preview`,
  };
}