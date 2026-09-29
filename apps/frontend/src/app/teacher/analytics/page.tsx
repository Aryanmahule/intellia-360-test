import { redirect } from "next/navigation";

/** Legacy scaffold route — analytics now lives in Reports & Analytics. */
export default function TeacherAnalyticsPage() {
  redirect("/teacher/reports");
}
