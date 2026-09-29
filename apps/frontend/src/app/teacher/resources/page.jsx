"use client";

import { useState } from "react";
import { FileText, Image, Presentation, File, Download, Search } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, Input, Pill } from "@/components/teacher/ui";

const TYPE_ICON = { PDF: FileText, Slides: Presentation, Image: Image, Doc: File };

export default function Resources() {
  const { resources, notify } = useData();
  const [query, setQuery] = useState("");

  const filtered = resources.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
        <Input placeholder="Search resources…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const Icon = TYPE_ICON[r.type] || File;
          return (
            <Card key={r.id} className="p-4 flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-violet-tint text-violet grid place-items-center shrink-0">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-tight">{r.title}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {r.grade && <Pill tone="violet">Grade {r.grade}</Pill>}
                  <span className="text-[11px] text-ink/40">{r.size}</span>
                </div>
              </div>
              <button type="button" onClick={() => notify(`Downloading "${r.title}"…`)} aria-label={`Download ${r.title}`} className="p-2 rounded-lg hover:bg-black/5 text-ink/50 shrink-0">
                <Download size={15} />
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
