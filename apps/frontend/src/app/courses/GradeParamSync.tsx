"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Reports the `?grade=` the courses page was opened with — the site header's
 * grade links set it — so the carousel can start on that grade.
 *
 * It is its own component because useSearchParams needs a Suspense boundary
 * for the page around it to stay statically prerendered.
 */
export default function GradeParamSync({ onGrade }: { onGrade: (gradeId: string) => void }) {
  const grade = useSearchParams().get("grade");

  useEffect(() => {
    if (grade) onGrade(grade);
  }, [grade, onGrade]);

  return null;
}
