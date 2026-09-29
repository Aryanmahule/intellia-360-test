"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users2, GraduationCap, BookOpen, ClipboardList,
  BarChart3, CalendarCheck, Trophy, MessageSquare,
  Bot, FolderOpen, Settings, Sparkles,
} from "lucide-react";
import { useData } from "@/context/TeacherDataContext";

const NAV = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/teacher/classes", label: "My Classes", icon: Users2 },
  { href: "/teacher/students", label: "Students", icon: GraduationCap },
  { href: "/teacher/lessons", label: "Lessons", icon: BookOpen },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/reports", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/rewards", label: "Rewards", icon: Trophy },
  { href: "/teacher/messages", label: "Messages", icon: MessageSquare, badgeKey: "messages" },
  { href: "/teacher/ai-assistant", label: "AI Assistant", icon: Bot, tag: "New" },
  { href: "/teacher/resources", label: "Resources", icon: FolderOpen },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onNavigate }) {
  const { messages } = useData();
  const pathname = usePathname();
  const unread = messages.filter((m) => m.unread).length;

  const isActive = (href, exact) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={`fixed z-40 inset-y-0 left-0 w-[248px] bg-ink text-white flex flex-col
      transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-violet grid place-items-center shrink-0">
          <Sparkles size={17} strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="font-display font-semibold text-[17px] tracking-tight">Intellia360</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/40 -mt-0.5">Teacher Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, tag, badgeKey }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${
              isActive(href, exact)
                ? "bg-violet text-white shadow-[0_4px_14px_rgba(91,61,245,0.35)]"
                : "text-white/65 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={2.1} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {badgeKey === "messages" && unread > 0 && (
              <span className="text-[10px] font-bold bg-coral text-white rounded-full min-w-[18px] h-[18px] grid place-items-center">
                {unread}
              </span>
            )}
            {tag && (
              <span className="text-[9.5px] font-bold uppercase tracking-wide bg-amber text-ink px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-3 m-3 mt-0 rounded-2xl bg-gradient-to-br from-violet to-violet-deep relative overflow-hidden">
        <div className="absolute -right-4 -bottom-6 opacity-20">
          <Trophy size={80} />
        </div>
        <p className="text-[12.5px] font-semibold relative">Weekly report is ready</p>
        <p className="text-[11px] text-white/70 mt-0.5 relative">See how your classes did this week.</p>
        <Link
          href="/teacher/reports"
          onClick={onNavigate}
          className="mt-2.5 inline-block text-[11.5px] font-semibold bg-white text-violet-deep px-3 py-1.5 rounded-lg relative hover:bg-white/90"
        >
          View report →
        </Link>
      </div>
    </aside>
  );
}
