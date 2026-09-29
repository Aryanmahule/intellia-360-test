"use client";

import { useState } from "react";
import { Send, Search, Mail } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, Input, Button, EmptyState } from "@/components/teacher/ui";

export default function Messages() {
  const { messages, sendReply, markThreadRead } = useData();
  const [activeId, setActiveId] = useState(messages[0]?.id);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");

  const filtered = messages.filter(
    (m) => m.from.toLowerCase().includes(query.toLowerCase()) || m.subject.toLowerCase().includes(query.toLowerCase())
  );
  const active = messages.find((m) => m.id === activeId);

  const open = (id) => {
    setActiveId(id);
    markThreadRead(id);
  };

  const send = () => {
    if (!draft.trim() || !active) return;
    sendReply(active.id, draft.trim());
    setDraft("");
  };

  return (
    <Card className="grid md:grid-cols-[300px_1fr] h-[calc(100vh-160px)] min-h-[520px] overflow-hidden">
      <div className="border-r border-black/[0.06] flex flex-col">
        <div className="p-3.5 border-b border-black/[0.06]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30" />
            <Input placeholder="Search messages…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 py-2 text-[12.5px]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => open(m.id)}
              className={`w-full text-left px-4 py-3 border-b border-black/[0.05] transition-colors ${activeId === m.id ? "bg-violet-tint/50" : "hover:bg-black/[0.02]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[13px] truncate ${m.unread ? "font-bold" : "font-medium"}`}>{m.from}</p>
                <span className="text-[10.5px] text-ink/35 shrink-0">{m.time}</span>
              </div>
              <p className="text-[12px] text-ink/55 truncate mt-0.5">{m.subject}</p>
              <p className="text-[11.5px] text-ink/35 truncate mt-0.5">{m.preview}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        {active ? (
          <>
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <p className="font-display font-semibold text-[16px]">{active.subject}</p>
              <p className="text-[12px] text-ink/45">with {active.from}</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3">
              {active.thread.map((t, i) => (
                <div key={i} className={`max-w-[75%] ${t.from === "me" ? "ml-auto" : ""}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-snug ${t.from === "me" ? "bg-violet text-white rounded-br-sm" : "bg-canvas rounded-bl-sm"}`}>
                    {t.text}
                  </div>
                  <p className={`text-[10.5px] text-ink/35 mt-1 ${t.from === "me" ? "text-right" : ""}`}>{t.time}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-black/[0.06] flex gap-2">
              <Input
                placeholder="Type a reply…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <Button onClick={send} aria-label="Send reply"><Send size={14} /></Button>
            </div>
          </>
        ) : (
          <EmptyState icon={Mail} title="No conversation selected" body="Pick a message from the list to view it." />
        )}
      </div>
    </Card>
  );
}
