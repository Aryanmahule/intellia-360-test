"use client";

import React from "react";
import { ReportConfig } from "@/data/admin/reports";
import { FileText, Clock } from "@/components/admin/icons";

interface ReportCardProps {
  report: ReportConfig;
}

export default function ReportCard({ report }: ReportCardProps) {
  return (
    <div className="admin-card flex flex-col justify-between hover:border-orange-300 transition-all duration-200">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
            {report.category}
          </span>
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {report.lastGenerated}
          </span>
        </div>

        <h4 className="text-base font-extrabold text-slate-900 mb-1.5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-500 shrink-0" />
          {report.title}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">{report.description}</p>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-400">
          {report.fileSize} • {report.downloads} downloads
        </span>
      </div>
    </div>
  );
}
