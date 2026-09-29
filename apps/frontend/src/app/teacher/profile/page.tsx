import { redirect } from "next/navigation";

/** Legacy scaffold route — profile fields live on the settings page. */
export default function TeacherProfilePage() {
  redirect("/teacher/settings");
}
