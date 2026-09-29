"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AlertTriangle, TrendingUp, Users2, Award, Download } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Avatar, Pill, Button } from "@/components/teacher/ui";
import { WEEKLY_TREND, ACTIVITY_ENGAGEMENT } from "@/data/teacher/mockData";

export default function Reports() {
  const { students, classes } = useData();

  const atRisk = useMemo(
    () => students.filter((s) => s.status === "at-risk").sort((a, b) => a.progress - b.progress).slice(0, 6),
    [students]
  );

  const classPerf = classes.map((c) => ({ name: c.name.split(" — ")[0], avg: c.avgProgress, color: `var(--color-${c.color})` }));

  const kpis = [
    { label: "Avg. class completion", value: `${Math.round(classes.reduce((a, c) => a + c.avgProgress, 0) / classes.length)}%`, icon: TrendingUp, tint: "jade" },
    { label: "Active students", value: students.length, icon: Users2, tint: "violet" },
    { label: "At-risk students", value: atRisk.length, icon: AlertTriangle, tint: "coral" },
    { label: "Badges awarded", value: students.reduce((a, s) => a + s.badges.length, 0), icon: Award, tint: "amber" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm"><Download size={14} /> Export report</Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, tint }) => (
          <Card key={label} className="p-4">
            <span className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: `var(--color-${tint}-tint)`, color: `var(--color-${tint})` }}>
              <Icon size={16} />
            </span>
            <p className="font-mono font-bold text-[22px] mt-2.5">{value}</p>
            <p className="text-[11.5px] text-ink/45 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card>
          <CardHeader eyebrow="Last 7 days" title="Completion & Engagement Trend" />
          <div className="h-[260px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEKLY_TREND} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEDF7" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8A8AA0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8AA0" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="completion" name="Completion %" stroke="#5B3DF5" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="engagement" name="Engagement %" stroke="#F5A524" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="By class" title="Average Progress" />
          <div className="h-[260px] px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classPerf} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEDF7" />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#8A8AA0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8AA0" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} formatter={(v) => [`${v}%`, "Avg progress"]} />
                <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                  {classPerf.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
        <Card>
          <CardHeader eyebrow="Distribution" title="Activity Status" />
          <div className="h-[220px] px-3 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ACTIVITY_ENGAGEMENT} dataKey="value" nameKey="name" outerRadius={78} label={({ value }) => `${value}%`} labelLine={false}>
                  {ACTIVITY_ENGAGEMENT.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eee", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Needs support" title="At-Risk Students" action={<Pill tone="coral"><AlertTriangle size={11} /> {atRisk.length} flagged</Pill>} />
          <div className="divide-y divide-black/[0.05]">
            {atRisk.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={s.name} initials={s.initials} color={s.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-ink/40">Struggling with {s.weakTopic}</p>
                </div>
                <span className="font-mono text-[12.5px] font-bold text-coral">{s.progress}%</span>
              </div>
            ))}
            {atRisk.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-ink/40">Nobody&apos;s flagged right now — great work!</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
