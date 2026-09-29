"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Toast from "./Toast";

const PAGE_META = {
  "/teacher/dashboard": ["Dashboard", "Here's what's happening in your classroom today."],
  "/teacher/classes": ["My Classes", "Manage rosters, schedules, and class-level progress."],
  "/teacher/students": ["Students", "Search, filter, and drill into every learner's profile."],
  "/teacher/lessons": ["Lessons", "Browse and publish curriculum content by grade."],
  "/teacher/assignments": ["Assignments", "Create, assign, and track homework and worksheets."],
  "/teacher/reports": ["Reports & Analytics", "Engagement, completion, and at-risk trends."],
  "/teacher/attendance": ["Attendance", "Mark daily attendance for each class."],
  "/teacher/rewards": ["Rewards", "Badges, XP rules, and the class leaderboard."],
  "/teacher/messages": ["Messages", "Conversations with parents, students, and staff."],
  "/teacher/ai-assistant": ["AI Teaching Assistant", "Ask for insights, weak topics, and quick actions."],
  "/teacher/resources": ["Resources", "Shared teaching materials and downloads."],
  "/teacher/settings": ["Settings", "Your profile, notifications, and preferences."],
};

export default function TeacherShell({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  // Nested routes (/teacher/classes/c1) inherit their parent section's heading.
  const base = "/" + pathname.split("/").slice(1, 3).join("/");
  const [title, subtitle] = PAGE_META[pathname] || PAGE_META[base] || ["Intellia360", ""];

  return (
    <>
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="lg:pl-[248px] w-full">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
      <Toast />
    </>
  );
}
