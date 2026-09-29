import { redirect } from "next/navigation";

/** Legacy scaffold route — lesson planning is handled by the AI assistant. */
export default function TeacherAIPlannerPage() {
  redirect("/teacher/ai-assistant");
}
