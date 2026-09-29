"use client";

import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";

const ICONS = { success: CheckCircle2, info: Info, warn: AlertTriangle };
const TONES = { success: "bg-ink text-white", info: "bg-violet text-white", warn: "bg-coral text-white" };

export default function Toast() {
  const { toast } = useData();
  if (!toast) return null;
  const Icon = ICONS[toast.tone] || CheckCircle2;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-[13px] font-medium ${TONES[toast.tone] || TONES.success}`}>
        <Icon size={16} className="shrink-0" />
        {toast.text}
      </div>
    </div>
  );
}
