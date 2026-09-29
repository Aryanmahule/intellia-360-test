"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Trophy, Coins, Star } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, CardHeader, Avatar, Select } from "@/components/teacher/ui";

export default function Rewards() {
  const { badges, students, classes, xpRules } = useData();
  const [classFilter, setClassFilter] = useState("all");

  const leaderboard = useMemo(
    () =>
      students
        .filter((s) => classFilter === "all" || s.classId === classFilter)
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 12),
    [students, classFilter]
  );

  const badgeCounts = badges.map((b) => ({ ...b, count: students.filter((s) => s.badges.includes(b.id)).length }));

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
        <Card>
          <CardHeader eyebrow="Gamification catalog" title="Badges" />
          <div className="grid grid-cols-2 gap-3 p-5 pt-2">
            {badgeCounts.map((b) => {
              const Icon = Icons[b.icon] || Icons.Award;
              return (
                <div key={b.id} className="rounded-xl border border-black/[0.06] p-3.5 flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `var(--color-${b.tint}-tint)`, color: `var(--color-${b.tint})` }}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{b.name}</p>
                    <p className="text-[11px] text-ink/45 leading-snug mt-0.5">{b.criteria}</p>
                    <p className="text-[10.5px] font-mono font-semibold text-ink/35 mt-1">{b.count} earned</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="How students earn XP" title="XP & Coin Rules" />
          <div className="px-5 pb-5">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-ink/40 text-[11px] uppercase tracking-wide">
                  <th className="font-medium pb-2">Action</th>
                  <th className="font-medium pb-2 text-right">XP</th>
                  <th className="font-medium pb-2 text-right">Coins</th>
                </tr>
              </thead>
              <tbody>
                {xpRules.map((r) => (
                  <tr key={r.action} className="border-t border-black/[0.05]">
                    <td className="py-2.5">{r.action}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-amber">+{r.xp}</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-sky">+{r.coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 rounded-xl bg-violet-tint/60 border border-violet/15 p-3.5 text-[12px] text-ink/60 leading-snug">
              Rewards process asynchronously after each lesson or quiz — XP, coins, badge checks, and leaderboard updates all fire from the same completion event.
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Ranked by XP" title="Leaderboard" action={
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-auto min-w-[160px] py-1.5 text-[12.5px]">
            <option value="all">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name.split(" — ")[0]}</option>)}
          </Select>
        } />
        <div className="divide-y divide-black/[0.05]">
          {leaderboard.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`w-7 h-7 rounded-full grid place-items-center text-[11.5px] font-bold shrink-0 ${
                i === 0 ? "bg-amber text-white" : i === 1 ? "bg-ink/15 text-ink" : i === 2 ? "bg-coral/20 text-coral" : "bg-black/[0.04] text-ink/40"
              }`}>
                {i < 3 ? <Trophy size={13} /> : i + 1}
              </span>
              <Avatar name={s.name} initials={s.initials} color={s.color} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{s.name}</p>
                <p className="text-[11px] text-ink/40">{classes.find((c) => c.id === s.classId)?.name.split(" — ")[0]}</p>
              </div>
              <div className="flex items-center gap-1 text-[12px] font-mono font-semibold text-sky"><Coins size={12} /> {s.coins}</div>
              <div className="flex items-center gap-1 text-[12.5px] font-mono font-bold text-amber w-16 justify-end"><Star size={12} /> {s.xp}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
