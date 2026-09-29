"use client";

import { useMemo, useState } from "react";
import { Play, FileText, MousePointerClick, Plus, Clock, Search } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Pill, StatusPill, Button, Input, Select } from "@/components/teacher/ui";
import CreateLessonModal from "@/components/teacher/modals/CreateLessonModal";

const TYPE_ICON = { video: Play, text: FileText, interactive: MousePointerClick };

export default function Lessons() {
  const { courses } = useData();
  const [grade, setGrade] = useState("all");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [custom, setCustom] = useState([]);

  const chapters = useMemo(() => {
    const list = courses
      .filter((c) => grade === "all" || c.grade === Number(grade))
      .flatMap((c) => c.chapters);
    return list;
  }, [courses, grade]);

  const matches = (lsn) => lsn.title.toLowerCase().includes(query.toLowerCase());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <Input placeholder="Search lessons…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-auto min-w-[140px]">
          <option value="all">All grades</option>
          {courses.map((c) => <option key={c.id} value={c.grade}>Grade {c.grade}</option>)}
        </Select>
        <Button onClick={() => setShowCreate(true)}><Plus size={15} /> New lesson</Button>
      </div>

      {custom.length > 0 && (
        <Card>
          <CardHeader eyebrow="Just now" title="My Draft Lessons" />
          <div className="divide-y divide-black/[0.05]">
            {custom.map((l) => <LessonRow key={l.id} l={l} />)}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {chapters.map((ch) => {
          const lessons = ch.lessons.filter(matches);
          if (lessons.length === 0) return null;
          return (
            <Card key={ch.id}>
              <CardHeader eyebrow={`Grade ${lessons[0].grade}`} title={ch.title} action={<Pill tone="violet">{lessons.length} lessons</Pill>} />
              <div className="divide-y divide-black/[0.05]">
                {lessons.map((l) => <LessonRow key={l.id} l={l} />)}
              </div>
            </Card>
          );
        })}
      </div>

      <CreateLessonModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={(l) => setCustom((p) => [l, ...p])} />
    </div>
  );
}

function LessonRow({ l }) {
  const Icon = TYPE_ICON[l.type];
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02]">
      <span className="w-9 h-9 rounded-lg bg-violet-tint text-violet grid place-items-center shrink-0">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium truncate">{l.title}</p>
        <p className="text-[11px] text-ink/40 flex items-center gap-1"><Clock size={11} /> {l.duration} · {l.type}</p>
      </div>
      <StatusPill status={l.status === "published" ? "Published" : "Draft"} />
    </div>
  );
}
