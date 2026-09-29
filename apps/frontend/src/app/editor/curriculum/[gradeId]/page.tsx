import CurriculumClient from "./CurriculumClient";
import { placeholderParams } from "@/lib/route-placeholder";

// Static export: one shell serves every [gradeId]. CloudFront routes each
// id to it (deploy/cloudfront/frontend-router.js) and CurriculumClient reads the real
// id from the URL (useRouteParams).
export const dynamicParams = false;

export function generateStaticParams() {
  return placeholderParams("gradeId");
}

export default function Page() {
  return <CurriculumClient />;
}
