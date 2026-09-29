"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRouteParams } from "@/lib/route-params";
import { ArrowLeft, UserPlus, ClipboardList, Search } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Avatar, StatusPill, Button, Input, ProgressRing, Pill } from "@/components/teacher/ui";
import AddStudentModal from "@/components/teacher/modals/AddStudentModal";
import CreateAssignmentModal from "@/components/teacher/modals/CreateAssignmentModal";

export default function ClassDetail() {
  const { id } = useRouteParams("/teacher/classes/:id");
  const router = useRouter();
  const { classes, students, assignments, liveStats } = useData();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);

  const cls = classes.find((c) => c.id === id);
  if (!cls) return <p className="text-ink/50">Class not found.</p>;

  const roster = students
    .filter((s) => s.classId === id)
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.xp - a.xp);
  const classAssignments = assignments.filter((a) => a.classId === id);

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/teacher/classes")} className="flex items-center gap-1.5 text-[13px] font-medium text-ink/50 hover:text-ink">
        <ArrowLeft size={15} /> Back to classes
      </button>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone={cls.color}>Grade {cls.grade}</Pill>
            <h2 className="font-display font-semibold text-[22px] mt-2">{cls.name}</h2>
            <p className="text-[13px] text-ink/50 mt-1">{cls.schedule} · {cls.room}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <ProgressRing value={cls.avgProgress} size={58} color={`var(--color-${cls.color})`} />
              <p className="text-[11px] text-ink/45 mt-1">Class Avg</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModal("assignment")}><ClipboardList size={14} /> Assign work</Button>
              <Button size="sm" onClick={() => setModal("student")}><UserPlus size={14} /> Add student</Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card>
          <CardHeader eyebrow={`${roster.length} students`} title="Roster" action={
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30" />
              <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 py-1.5 text-[12.5px] w-40" />
            </div>
          } />
          <div className="divide-y divide-black/[0.05]">
            {roster.map((s) => (
              <Link href={`/teacher/students?open=${s.id}`} key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02]">
                <Avatar name={s.name} initials={s.initials} color={s.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-ink/40">{s.xp} XP · {s.streak} day streak</p>
                </div>
                <div className="w-24 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                    <div className="h-full bg-jade rounded-full" style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
                <span className="font-mono text-[12px] font-semibold w-9 text-right">{s.progress}%</span>
              </Link>
            ))}
            {roster.length === 0 && <p className="text-center text-[13px] text-ink/40 py-8">No students match your search.</p>}
          </div>
        </Card>

        <Card className="p-5 h-fit">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet mb-3">Class Assignments</p>
          <div className="space-y-2.5">
            {classAssignments.length === 0 && <p className="text-[12.5px] text-ink/40">No assignments yet for this class.</p>}
            {classAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-ink/40">{a.submitted}/{a.total} submitted</p>
                </div>
                <StatusPill status={a.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AddStudentModal open={modal === "student"} onClose={() => setModal(null)} defaultClassId={id} />
      <CreateAssignmentModal
        open={modal === "assignment"}
        onClose={() => setModal(null)}
        classes={liveStats?.assignedClasses ?? []}
        defaultClassId={id}
      />
    </div>
  );
}
