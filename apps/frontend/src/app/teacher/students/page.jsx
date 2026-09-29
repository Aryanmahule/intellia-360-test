"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, Flame, Star, Coins, TrendingUp, X } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, Avatar, Pill, Input, Select, Button, EmptyState } from "@/components/teacher/ui";
import AddStudentModal from "@/components/teacher/modals/AddStudentModal";
import * as Icons from "lucide-react";

/**
 * Reads ?open=<studentId> in its own Suspense boundary.
 *
 * useSearchParams opts its whole subtree out of prerendering, so it is isolated
 * here — the directory itself still renders on the server.
 */
function OpenStudentParam({ onOpen }) {
  const openParam = useSearchParams().get("open");
  useEffect(() => {
    if (openParam) onOpen(openParam);
  }, [openParam, onOpen]);
  return null;
}

const STATUS_TONE = { "at-risk": "coral", "on-track": "amber", ahead: "jade" };
const STATUS_LABEL = { "at-risk": "At risk", "on-track": "On track", ahead: "Ahead" };

function StudentsDirectory() {
  const { students, classes, badges, awardXp, notify } = useData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const openedFromUrl = useRef(false);
  const openFromUrl = useCallback((id) => {
    openedFromUrl.current = true;
    setOpenId(id);
  }, []);

  const filtered = useMemo(
    () =>
      students
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
        .filter((s) => classFilter === "all" || s.classId === classFilter)
        .filter((s) => statusFilter === "all" || s.status === statusFilter)
        .sort((a, b) => b.xp - a.xp),
    [students, query, classFilter, statusFilter]
  );

  const active = students.find((s) => s.id === openId);
  const activeClass = active && classes.find((c) => c.id === active.classId);

  const close = () => {
    setOpenId(null);
    // Drop ?open= so a refresh does not reopen the drawer.
    if (openedFromUrl.current) {
      openedFromUrl.current = false;
      router.replace("/teacher/students", { scroll: false });
    }
  };

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <OpenStudentParam onOpen={openFromUrl} />
      </Suspense>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <Input placeholder="Search students…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-auto min-w-[160px]">
          <option value="all">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name.split(" — ")[0]}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto min-w-[140px]">
          <option value="all">All statuses</option>
          <option value="ahead">Ahead</option>
          <option value="on-track">On track</option>
          <option value="at-risk">At risk</option>
        </Select>
        <Button onClick={() => setShowAdd(true)}><UserPlus size={15} /> Add student</Button>
      </div>

      <p className="text-[12.5px] text-ink/45">{filtered.length} of {students.length} students</p>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Search} title="No students found" body="Try a different name or clear your filters." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((s) => (
            <button key={s.id} onClick={() => setOpenId(s.id)} className="text-left">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} initials={s.initials} color={s.color} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[13.5px] truncate">{s.name}</p>
                    <p className="text-[11px] text-ink/40">{classes.find((c) => c.id === s.classId)?.name.split(" — ")[0]}</p>
                  </div>
                  <Pill tone={STATUS_TONE[s.status]} className="shrink-0">{STATUS_LABEL[s.status]}</Pill>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3.5">
                  <div className="flex items-center gap-1 text-[11.5px] text-ink/55"><Star size={12} className="text-amber" /> {s.xp}</div>
                  <div className="flex items-center gap-1 text-[11.5px] text-ink/55"><Flame size={12} className="text-coral" /> {s.streak}d</div>
                  <div className="flex items-center gap-1 text-[11.5px] text-ink/55"><Coins size={12} className="text-sky" /> {s.coins}</div>
                </div>
                <div className="h-1.5 rounded-full bg-black/[0.06] mt-3 overflow-hidden">
                  <div className="h-full bg-violet rounded-full" style={{ width: `${s.progress}%` }} />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Profile drawer */}
      {active && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={close} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="bg-gradient-to-br from-violet to-violet-deep text-white p-6 relative">
              <button onClick={close} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10"><X size={18} /></button>
              <div className="flex items-center gap-3.5">
                <Avatar name={active.name} initials={active.initials} color="#ffffff33" size={56} />
                <div>
                  <p className="font-display font-semibold text-[19px]">{active.name}</p>
                  <p className="text-[12.5px] text-white/70">{activeClass?.name} · Grade {active.grade}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: "XP", value: active.xp, icon: Star },
                  { label: "Coins", value: active.coins, icon: Coins },
                  { label: "Streak", value: `${active.streak}d`, icon: Flame },
                  { label: "Progress", value: `${active.progress}%`, icon: TrendingUp },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center">
                    <Icon size={14} className="mx-auto mb-1 text-amber" />
                    <p className="font-mono font-bold text-[13px]">{value}</p>
                    <p className="text-[9.5px] text-white/55">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <Pill tone={STATUS_TONE[active.status]}>{STATUS_LABEL[active.status]}</Pill>
                <span className="text-[11.5px] text-ink/40">Active {active.lastActive}</span>
              </div>

              {active.status === "at-risk" && (
                <div className="bg-coral-tint border border-coral/20 rounded-xl p-3.5">
                  <p className="text-[12.5px] font-semibold text-coral">Needs attention</p>
                  <p className="text-[12px] text-ink/60 mt-0.5">Struggling most with <b>{active.weakTopic}</b>. Consider assigning a targeted practice set or an AI hint session.</p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2">Badges earned</p>
                {active.badges.length === 0 ? (
                  <p className="text-[12.5px] text-ink/40">No badges yet — encourage a first quiz attempt!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {active.badges.map((bid) => {
                      const b = badges.find((x) => x.id === bid);
                      if (!b) return null;
                      const Icon = Icons[b.icon] || Icons.Award;
                      return (
                        <div key={bid} className="flex items-center gap-1.5 bg-amber-tint text-amber px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold">
                          <Icon size={13} /> {b.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1 justify-center"
                  onClick={() => { awardXp(active.id, 50, 10); notify(`Gave ${active.name.split(" ")[0]} a 50 XP boost`); }}
                >
                  <Star size={14} /> Give XP boost
                </Button>
                <Button className="flex-1 justify-center" onClick={() => notify(`Message sent to ${active.name.split(" ")[0]}'s parent`)}>
                  Message parent
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddStudentModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

export default function StudentsPage() {
  return <StudentsDirectory />;
}
