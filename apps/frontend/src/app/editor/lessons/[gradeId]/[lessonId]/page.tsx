import LessonEditorClient from "./LessonEditorClient";
import { placeholderParams } from "@/lib/route-placeholder";

// Static export: one shell serves every [gradeId]/[lessonId]. CloudFront routes each
// id to it (deploy/cloudfront/frontend-router.js) and LessonEditorClient reads the real
// id from the URL (useRouteParams).
export const dynamicParams = false;

export function generateStaticParams() {
  return placeholderParams("gradeId", "lessonId");
}

export default function Page() {
  return <LessonEditorClient />;
}
