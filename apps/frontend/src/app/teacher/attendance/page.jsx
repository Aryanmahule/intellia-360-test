"use client";

import { useMemo, useState } from "react";
import { Check, X, Clock3, Save } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Avatar, Select, Input, Pill, Button } from "@/components/teacher/ui";

const STATES = [
  { key: "present", label: "Present", icon: Check, tone: "jade" },
  { key: "late", label: "Late", icon: Clock3, tone: "amber" },
  { key: "absent", label: "Absent", icon: X, tone: "coral" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const { classes, students, attendance, setAttendanceFor, notify } = useData();
  const [classId, setClassId] = useState(classes[0]?.id);
  const [date, setDate] = useState(todayISO());

  const roster = useMemo(() => students.filter((s) => s.classId === classId), [students, classId]);
  const key = `${classId}|${date}`;
  const dayRecord = attendance[key] || {};

  const counts = STATES.reduce((acc, s) => {
    acc[s.key] = roster.filter((st) => dayRecord[st.id] === s.key).length;
    return acc;
  }, {});
  const unmarked = roster.length - Object.values(counts).reduce((a, b) => a + b, 0);

  const markAll = (status) => roster.forEach((s) => setAttendanceFor(classId, date, s.id, status));

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="block text-[11.5px] font-semibold text-ink/50 mb-1.5">Class</label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="min-w-[170px]">
            <label className="block text-[11.5px] font-semibold text-ink/50 mb-1.5">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button variant="secondary" size="sm" onClick={() => markAll("present")}>Mark all present</Button>
          <Button variant="ghost" size="sm" onClick={() => notify("Attendance saved for today")}><Save size={14} /> Save</Button>

          <div className="flex gap-2 ml-auto">
            {STATES.map((s) => (
              <Pill key={s.key} tone={s.tone}>{counts[s.key]} {s.label}</Pill>
            ))}
            <Pill tone="ink">{unmarked} Unmarked</Pill>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow={date} title="Mark attendance" />
        <div className="divide-y divide-black/[0.05]">
          {roster.map((s) => {
            const current = dayRecord[s.id];
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={s.name} initials={s.initials} color={s.color} size={32} />
                <p className="text-[13px] font-medium flex-1 truncate">{s.name}</p>
                <div className="flex gap-1.5">
                  {STATES.map(({ key: k, label, icon: Icon, tone }) => (
                    <button
                      key={k}
                      onClick={() => setAttendanceFor(classId, date, s.id, k)}
                      title={label}
                      className={`w-8 h-8 rounded-lg grid place-items-center border transition-colors ${
                        current === k
                          ? `border-transparent text-white`
                          : "border-black/10 text-ink/35 hover:bg-black/[0.04]"
                      }`}
                      style={current === k ? { background: `var(--color-${tone})` } : {}}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
