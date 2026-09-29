"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Users2, GraduationCap, TrendingUp, Activity, Sparkles, Bot,
  BarChart3, Lightbulb, BookOpen, ClipboardList, UserPlus,
  ChevronRight, Flame, Trophy, CalendarClock, Users, FileCheck2,
  AlertTriangle, PlusCircle, Target,
} from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Pill, StatusPill, Avatar, ProgressRing, Button } from "@/components/teacher/ui";
import HeroIllustration from "@/components/teacher/HeroIllustration";
import { ACTIVITY_ENGAGEMENT } from "@/data/teacher/mockData";
import AddStudentModal from "@/components/teacher/modals/AddStudentModal";
import CreateAssignmentModal from "@/components/teacher/modals/CreateAssignmentModal";
import CreateLessonModal from "@/components/teacher/modals/CreateLessonModal";

const ACTIVITY_ICONS = { Sparkles, ClipboardList, PlusCircle, AlertTriangle, Target };
const REMINDER_ICONS = { CalendarClock, Users, FileCheck2 };

const TIPS = [
  "Break lessons into small, engaging chunks for better understanding.",
  "Celebrate streaks publicly — visible progress keeps students coming back.",
  "Pair a struggling topic with a quick AI-generated practice set.",
  "A two-line parent note after a badge unlock boosts home engagement.",
];

export default function Dashboard() {
  const { teacher, classes, students, notify, liveStats } = useData();
  const router = useRouter();
  const [modal, setModal] = useState(null);

  // Once /api/teacher/me reports real classes for the signed-in teacher, the
  // headline figures come from the database; until then, from the console data.
  const totals = useMemo(() => {
    if (liveStats?.assignedClasses?.length) {
      return {
        classes: liveStats.assignedClasses.length,
        students: liveStats.totalStudents ?? 0,
        avgProgress: liveStats.averageCompletion ?? 0,
        activities: liveStats.activeAssignments ?? 0,
      };
    }
    const totalStudents = students.length;
    const avgProgress = Math.round(students.reduce((a, s) => a + s.progress, 0) / totalStudents);
    return { classes: classes.length, students: totalStudents, avgProgress, activities: 128 };
  }, [classes, students, liveStats]);

  const topPerformers = useMemo(
    () => [...students].sort((a, b) => b.xp - a.xp).slice(0, 3),
    [students]
  );

  const RECENT_ACTIVITY = [
    { id: 1, title: "Fractions Check-in", meta: "Grade 3 Math · 28 students", status: "Completed", time: "2h ago", icon: "Sparkles" },
    { id: 2, title: "Place Value Assignment", meta: "Grade 2 Math · 28 students", status: "In Progress", time: "4h ago", icon: "ClipboardList" },
    { id: 3, title: "Addition Practice", meta: "Grade 3 Math · 34 students", status: "Completed", time: "1d ago", icon: "PlusCircle" },
    { id: 4, title: "Angles Mini-Project", meta: "Grade 4 Math · 30 students", status: "Overdue", time: "2d ago", icon: "AlertTriangle" },
  ];
  const REMINDERS = [
    { id: 1, title: "Assignment due tomorrow", meta: "Grade 3 Math", icon: "CalendarClock" },
    { id: 2, title: "Parent meeting at 4 PM", meta: "Student guardian", icon: "Users" },
    { id: 3, title: "2 assignments need review", meta: "Grade 4 Math", icon: "FileCheck2" },
  ];
  // UTC, not local: the page is server-rendered, so a server in one timezone
  // and a browser in another would otherwise pick different tips and trip a
  // hydration mismatch.
  const tip = TIPS[new Date().getUTCDate() % TIPS.length];

  const askAi = (prompt) =>
    router.push(`/teacher/ai-assistant?prompt=${encodeURIComponent(prompt)}`);

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <Card className="relative overflow-hidden bg-gradient-to-br from-ink to-violet text-white border-none">
          <div className="absolute inset-0 ledger-lines-violet opacity-40 pointer-events-none" />
          <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-6 p-6 sm:p-8">
            <div>
              <Pill className="bg-white/15 text-white backdrop-blur-sm">
                <Trophy size={12} /> TEACHER COMMAND CENTER
              </Pill>
              <h2 className="font-display font-semibold text-[28px] sm:text-[32px] leading-[1.12] mt-3">
                Welcome back, {teacher.name.split(" ")[0]} 👋
              </h2>
              <p className="text-white/70 text-[14px] mt-2 max-w-sm">
                Track progress, motivate learners, and make every lesson impactful — {totals.students} students across {totals.classes} classes are counting on you.
              </p>

              <div className="grid grid-cols-4 gap-2.5 mt-6 max-w-md">
                {[
                  { icon: Users2, label: "Classes", value: totals.classes },
                  { icon: GraduationCap, label: "Students", value: totals.students },
                  { icon: TrendingUp, label: "Avg Progress", value: `${totals.avgProgress}%` },
                  { icon: Activity, label: "Activities", value: totals.activities },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                    <Icon size={15} className="text-amber mb-1.5" />
                    <p className="font-mono font-bold text-[16px] leading-none">{value}</p>
                    <p className="text-[10px] text-white/55 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button size="sm" className="bg-amber text-ink hover:bg-amber/90 shadow-none" onClick={() => setModal("assignment")}>
                  <ClipboardList size={14} /> Assign work
                </Button>
                <Button size="sm" variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => router.push("/teacher/reports")}>
                  <BarChart3 size={14} /> View reports
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <HeroIllustration />
            </div>
          </div>
        </Card>

        {/* AI ASSISTANT PANEL */}
        <Card className="p-5 flex flex-col bg-ink text-white border-none relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet grid place-items-center">
              <Bot size={18} />
            </div>
            <div>
              <p className="font-display font-semibold text-[15px]">AI Teaching Assistant</p>
              <p className="text-[11px] text-jade flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-jade pulse-dot" /> Online</p>
            </div>
          </div>
          <div className="bg-violet-tint rounded-2xl rounded-tl-sm p-3.5 text-[13px] text-ink font-medium mb-4">
            Hello, {teacher.name.split(" ")[0]}! Want a quick pulse on your classes, or should I flag topics students are struggling with?
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Class Insights", icon: BarChart3, prompt: "Give me a quick insight on my classes." },
              { label: "Weak Topics", icon: AlertTriangle, prompt: "Which topics are students struggling with?" },
              { label: "Recommend Activities", icon: Lightbulb, prompt: "Recommend an activity for my lowest-progress class." },
              { label: "Draft Lesson Plan", icon: BookOpen, prompt: "Help me draft a lesson plan." },
            ].map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                onClick={() => askAi(prompt)}
                className="text-left bg-white/[0.06] hover:bg-white/[0.12] transition-colors rounded-xl p-2.5"
              >
                <Icon size={14} className="text-amber mb-1.5" />
                <p className="text-[11.5px] font-medium leading-tight">{label}</p>
              </button>
            ))}
          </div>
          <Button onClick={() => router.push("/teacher/ai-assistant")} className="mt-auto justify-center bg-violet hover:bg-violet-deep">
            Ask AI Assistant <ChevronRight size={15} />
          </Button>
        </Card>
      </div>

      {/* CLASSES + ENGAGEMENT + QUICK ACTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr_1fr] gap-5">
        <Card>
          <CardHeader eyebrow="Roster snapshot" title="My Classes Overview" action={
            <Link href="/teacher/classes" className="text-[12px] font-semibold text-violet flex items-center gap-0.5 hover:underline">View all <ChevronRight size={13} /></Link>
          } />
          <div className="grid grid-cols-2 gap-3 p-5 pt-3">
            {classes.map((c) => (
              <Link href={`/teacher/classes/${c.id}`} key={c.id} className={`rounded-xl p-3.5 border border-black/[0.05] hover:shadow-md transition-shadow bg-${c.color}-tint/40`} style={{ background: `color-mix(in srgb, var(--color-${c.color}) 8%, white)` }}>
                <p className="font-semibold text-[13px] leading-tight">{c.name.split(" — ")[0]}</p>
                <p className="text-[11px] text-ink/45 mb-2.5">{c.studentIds.length} Students</p>
                <div className="flex items-center gap-2.5">
                  <ProgressRing value={c.avgProgress} size={44} stroke={5} color={`var(--color-${c.color})`} />
                  <div>
                    <p className="font-mono font-bold text-[13px] leading-none">{c.avgProgress}%</p>
                    <p className="text-[10px] text-ink/40 mt-1">Avg. Progress</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="This week" title="Activity Engagement" />
          <div className="px-5 pb-4">
            <div className="h-[168px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ACTIVITY_ENGAGEMENT} dataKey="value" innerRadius={54} outerRadius={76} paddingAngle={3} strokeWidth={0}>
                    {ACTIVITY_ENGAGEMENT.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <p className="font-mono font-bold text-[22px] leading-none">128</p>
                  <p className="text-[10px] text-ink/40 mt-1">Activities</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              {ACTIVITY_ENGAGEMENT.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11.5px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name} <span className="text-ink/40 ml-auto font-mono">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Create Lesson", icon: BookOpen, tint: "violet", onClick: () => setModal("lesson") },
              { label: "Create Assignment", icon: ClipboardList, tint: "amber", onClick: () => setModal("assignment") },
              { label: "Add Student", icon: UserPlus, tint: "sky", onClick: () => setModal("student") },
              { label: "View Reports", icon: BarChart3, tint: "jade", onClick: () => router.push("/teacher/reports") },
            ].map(({ label, icon: Icon, tint, onClick }) => (
              <button key={label} onClick={onClick} className="flex flex-col items-start gap-2 rounded-xl border border-black/[0.06] p-3 hover:border-violet/30 hover:shadow-sm transition">
                <span className={`w-8 h-8 rounded-lg grid place-items-center bg-${tint}-tint`} style={{ background: `var(--color-${tint}-tint)`, color: `var(--color-${tint})` }}>
                  <Icon size={15} />
                </span>
                <span className="text-[11.5px] font-medium text-left leading-tight">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-black/10">
            <div className="flex items-center gap-2 text-amber mb-1.5">
              <Lightbulb size={14} />
              <p className="text-[11px] font-bold uppercase tracking-wide">Teaching Tip</p>
            </div>
            <p className="text-[12.5px] text-ink/60 leading-snug">{tip}</p>
          </div>
        </Card>
      </div>

      {/* TOP PERFORMERS + RECENT ACTIVITY + REMINDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader eyebrow="This week" title="Top Performers" />
          <div className="px-5 pb-5 space-y-3">
            {topPerformers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${i === 0 ? "bg-amber text-white" : i === 1 ? "bg-ink/15 text-ink" : "bg-coral/20 text-coral"}`}>
                  {i + 1}
                </span>
                <Avatar name={s.name} initials={s.initials} color={s.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{s.name}</p>
                  <div className="h-1.5 rounded-full bg-black/[0.06] mt-1 overflow-hidden">
                    <div className="h-full bg-violet rounded-full" style={{ width: `${Math.min(100, (s.xp / topPerformers[0].xp) * 100)}%` }} />
                  </div>
                </div>
                <span className="font-mono text-[11.5px] font-semibold text-ink/60 shrink-0">{s.xp} XP</span>
              </div>
            ))}
            <Link href="/teacher/rewards" className="text-[12px] font-semibold text-violet flex items-center gap-0.5 hover:underline pt-1">
              Full leaderboard <ChevronRight size={13} />
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Latest" title="Recent Activities" action={
            <Link href="/teacher/assignments" className="text-[12px] font-semibold text-violet flex items-center gap-0.5 hover:underline">View all <ChevronRight size={13} /></Link>
          } />
          <div className="px-5 pb-5 space-y-1">
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACTIVITY_ICONS[a.icon];
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-black/[0.05] last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-violet-tint text-violet grid place-items-center shrink-0">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{a.title}</p>
                    <p className="text-[11px] text-ink/40 truncate">{a.meta}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusPill status={a.status} />
                    <p className="text-[10px] text-ink/35 mt-1">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Stay on top" title="Reminders" action={
            <span className="text-[12px] font-semibold text-violet flex items-center gap-0.5">View all <ChevronRight size={13} /></span>
          } />
          <div className="px-5 pb-5 space-y-1">
            {REMINDERS.map((r) => {
              const Icon = REMINDER_ICONS[r.icon];
              return (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-black/[0.05] last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-amber-tint text-amber grid place-items-center shrink-0">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{r.title}</p>
                    <p className="text-[11px] text-ink/40 truncate">{r.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-br from-amber to-[#e8940f] p-4 text-ink relative overflow-hidden">
            <Flame size={60} className="absolute -right-2 -bottom-3 opacity-20" />
            <p className="font-display font-semibold text-[13.5px] relative">7-day streak club</p>
            <p className="text-[11.5px] mt-1 relative text-ink/70">{students.filter((s) => s.streak >= 7).length} students are on a 7+ day streak this week.</p>
          </div>
        </Card>
      </div>

      <AddStudentModal open={modal === "student"} onClose={() => setModal(null)} />
      <CreateAssignmentModal
        open={modal === "assignment"}
        onClose={() => setModal(null)}
        classes={liveStats?.assignedClasses ?? []}
      />
      <CreateLessonModal open={modal === "lesson"} onClose={() => setModal(null)} onCreate={(l) => notify(`Lesson "${l.title}" created successfully!`)} />
    </div>
  );
}
