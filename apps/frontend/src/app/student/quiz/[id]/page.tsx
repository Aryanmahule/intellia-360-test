import QuizClient from "./QuizClient";
import { placeholderParams } from "@/lib/route-placeholder";

// Static export: one shell serves every [id]. CloudFront routes each
// id to it (deploy/cloudfront/frontend-router.js) and QuizClient reads the real
// id from the URL (useRouteParams).
export const dynamicParams = false;

export function generateStaticParams() {
  return placeholderParams("id");
}

export default function Page() {
  return <QuizClient />;
}
