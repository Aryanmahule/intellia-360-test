"use client";

import Link from "next/link";
import { Users2, Clock, MapPin, ChevronRight } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, ProgressRing, Pill } from "@/components/teacher/ui";

export default function MyClasses() {
  const { classes } = useData();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-ink/50">{classes.length} classes · {classes.reduce((a, c) => a + c.studentIds.length, 0)} students total</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {classes.map((c) => (
          <Link href={`/teacher/classes/${c.id}`} key={c.id}>
            <Card className="p-5 h-full hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between">
                <Pill tone={c.color}>Grade {c.grade}</Pill>
                <ProgressRing value={c.avgProgress} size={48} stroke={5} color={`var(--color-${c.color})`} />
              </div>
              <h3 className="font-display font-semibold text-[16px] mt-3">{c.name}</h3>
              <div className="space-y-1.5 mt-3 text-[12.5px] text-ink/55">
                <p className="flex items-center gap-1.5"><Users2 size={13} /> {c.studentIds.length} students</p>
                <p className="flex items-center gap-1.5"><Clock size={13} /> {c.schedule}</p>
                <p className="flex items-center gap-1.5"><MapPin size={13} /> {c.room}</p>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.06]">
                <span className="text-[12px] font-mono font-semibold text-ink/60">{c.avgXp} XP avg</span>
                <span className="text-[12px] font-semibold text-violet flex items-center gap-0.5">
                  View roster <ChevronRight size={13} />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
