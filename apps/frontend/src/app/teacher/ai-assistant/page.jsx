"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Send, Sparkles, BarChart3, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, Avatar } from "@/components/teacher/ui";

const QUICK = [
  { label: "Class Insights", icon: BarChart3, prompt: "Give me a quick insight on my classes." },
  { label: "Weak Topics", icon: AlertTriangle, prompt: "Which topics are students struggling with?" },
  { label: "Recommend Activities", icon: Lightbulb, prompt: "Recommend an activity for my lowest-progress class." },
  { label: "Draft Lesson Plan", icon: BookOpen, prompt: "Help me draft a lesson plan." },
];

function buildReply(prompt, ctx) {
  const p = prompt.toLowerCase();
  const { classes, students } = ctx;
  const atRisk = students.filter((s) => s.status === "at-risk");
  const weakest = [...classes].sort((a, b) => a.avgProgress - b.avgProgress)[0];
  const strongest = [...classes].sort((a, b) => b.avgProgress - a.avgProgress)[0];
  const topicCounts = {};
  atRisk.forEach((s) => { topicCounts[s.weakTopic] = (topicCounts[s.weakTopic] || 0) + 1; });
  const topWeakTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];

  if (p.includes("insight")) {
    return `Here's the pulse: ${strongest.name.split(" — ")[0]} is leading at ${strongest.avgProgress}% average progress, while ${weakest.name.split(" — ")[0]} trails at ${weakest.avgProgress}%. You have ${atRisk.length} students flagged at-risk across all classes — worth a check-in this week.`;
  }
  if (p.includes("weak") || p.includes("struggl")) {
    return topWeakTopic
      ? `${topWeakTopic[0]} is the most common weak spot right now — it's showing up for ${topWeakTopic[1]} at-risk students. I'd suggest a short re-teach segment followed by a structured worked-examples activity to confirm understanding.`
      : `Nothing stands out as a widespread weak topic right now — nice and steady across your classes.`;
  }
  if (p.includes("recommend") || p.includes("activit")) {
    return `For ${weakest.name.split(" — ")[0]} (lowest average at ${weakest.avgProgress}%), try a 10-minute peer pairing on ${weakest.grade <= 3 ? "hands-on manipulatives" : "a worked-example walkthrough"}, then close with a quick AI hint session for anyone still stuck.`;
  }
  if (p.includes("lesson plan") || p.includes("draft") || p.includes("plan")) {
    return `I can outline a lesson plan for you! Try starting with: 1. Warm-up (3 min), 2. Concept Introduction (10 min), 3. Guided Practice (12 min), and 4. Interactive Exit Ticket (5 min). Let me know which topic you'd like to target first!`;
  }
  if (p.includes("streak") || p.includes("engag")) {
    const streaks = students.filter((s) => s.streak >= 7).length;
    return `${streaks} students currently have a 7-day+ streak. A shout-out on the leaderboard tends to nudge a few more over that line before the weekend.`;
  }
  return `Got it — I looked at your ${classes.length} classes and ${students.length} students. Try asking about "weak topics," "class insights," or "recommend an activity" and I'll pull the specifics.`;
}

/**
 * Reads the ?prompt=… starter question handed over by the dashboard.
 *
 * useSearchParams opts its whole subtree out of prerendering, so it is isolated
 * in its own Suspense boundary and the chat itself still renders on the server.
 */
function InitialPromptParam({ onPrompt }) {
  const prompt = useSearchParams().get("prompt");
  useEffect(() => {
    if (prompt) onPrompt(prompt);
  }, [prompt, onPrompt]);
  return null;
}

function AiAssistantChat() {
  const ctx = useData();
  const [initialPrompt, setInitialPrompt] = useState(null);
  const [messages, setMessages] = useState([
    { from: "ai", text: `Hi ${ctx.teacher.name.split(" ")[0]}! I'm your teaching assistant. Ask me about class performance, weak topics, or let me help you draft a lesson plan.` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const askedRef = useRef(false);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMessages((m) => [...m, { from: "me", text: t }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { from: "ai", text: buildReply(t, ctx) }]);
      setTyping(false);
    }, 700);
  };

  useEffect(() => {
    if (initialPrompt && !askedRef.current) {
      askedRef.current = true;
      send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <Suspense fallback={null}>
        <InitialPromptParam onPrompt={setInitialPrompt} />
      </Suspense>

      <Card className="flex flex-col h-[calc(100vh-160px)] min-h-[520px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-ink text-white grid place-items-center"><Bot size={17} /></div>
          <div>
            <p className="font-display font-semibold text-[15px]">Teaching Assistant</p>
            <p className="text-[11px] text-jade flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-jade pulse-dot" /> Grounded in your live class data</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-3.5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 max-w-[80%] ${m.from === "me" ? "ml-auto flex-row-reverse" : ""}`}>
              {m.from === "ai" ? (
                <div className="w-7 h-7 rounded-full bg-ink text-white grid place-items-center shrink-0"><Sparkles size={13} /></div>
              ) : (
                <Avatar name="You" initials={ctx.teacher.initials} size={28} />
              )}
              <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${m.from === "me" ? "bg-violet text-white rounded-tr-sm" : "bg-canvas rounded-tl-sm"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-ink text-white grid place-items-center shrink-0"><Sparkles size={13} /></div>
              <div className="bg-canvas rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-ink/30 pulse-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-black/[0.06] flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about a class, a student, or a topic…"
            className="flex-1 bg-canvas border border-black/10 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet focus:ring-2 focus:ring-violet/15"
          />
          <button type="button" onClick={() => send()} aria-label="Send message" className="bg-violet text-white rounded-xl px-4 grid place-items-center hover:bg-violet-deep">
            <Send size={16} />
          </button>
        </div>
      </Card>

      <Card className="p-4 h-fit">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet mb-3">Quick prompts</p>
        <div className="space-y-2">
          {QUICK.map(({ label, icon: Icon, prompt }) => (
            <button key={label} onClick={() => send(prompt)} className="w-full text-left flex items-center gap-2.5 rounded-xl border border-black/[0.06] p-2.5 hover:border-violet/30 hover:bg-violet-tint/30 transition">
              <span className="w-8 h-8 rounded-lg bg-violet-tint text-violet grid place-items-center shrink-0"><Icon size={14} /></span>
              <span className="text-[12.5px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function AiAssistantPage() {
  return <AiAssistantChat />;
}
