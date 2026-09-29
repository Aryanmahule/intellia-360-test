"use client";

import React from "react";
import Link from "next/link";
import type { AdminKpi } from "@/data/admin/useAdminDashboard";
import { formatCount, useCountUp } from "@/data/admin/useAdminDashboard";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
  TrendingUp,
  TrendingDown,
} from "@/components/admin/icons";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  UserCheck,
};

interface KPICardProps {
  kpi: AdminKpi;
  /** Label of the window this KPI is compared against, e.g. "1 Apr – 30 Apr". */
  comparisonLabel: string;
}

/** Normalises a series into an SVG path + matching area polygon. */
function buildSparkline(series: number[], width: number, height: number) {
  if (series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);

  // A flat line carries no information — a metric that never moved (or is still
  // at zero) is better shown with no sparkline at all.
  if (min === max) return null;

  const span = max - min || 1;
  const stepX = width / (series.length - 1);

  const points = series.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return { line, area };
}

export default function KPICard({ kpi, comparisonLabel }: KPICardProps) {
  const shownValue = useCountUp(kpi.value);
  const Icon = iconMap[kpi.icon] ?? Users;
  const spark = buildSparkline(kpi.series, 120, 30);
  const gradientId = `kpi-spark-${kpi.id}`;

  const hasGrowth = kpi.growthPercent !== null;
  const isUp = (kpi.growthPercent ?? 0) >= 0;

  return (
    <Link href={kpi.href} className={`stat-card tone-${kpi.color}${spark ? " has-spark" : ""}`}>
      <div className="stat-card-top">
        <span className="stat-icon-box">
          <Icon className="w-5 h-5" />
        </span>

        <div className="stat-card-heading">
          <span className="stat-card-title">{kpi.title}</span>
          <span className="stat-card-value">{formatCount(shownValue)}</span>
        </div>
      </div>

      <div className="stat-card-footer">
        {hasGrowth ? (
          <>
            <span className={`stat-card-growth${isUp ? " is-up" : " is-down"}`}>
              {isUp ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(kpi.growthPercent ?? 0)}%
            </span>
            <span className="stat-card-timeframe">vs {comparisonLabel}</span>
          </>
        ) : (
          <span className="stat-card-timeframe">No prior period to compare</span>
        )}
      </div>

      {spark && (
        <svg
          className="stat-card-spark"
          viewBox="0 0 120 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={spark.area} fill={`url(#${gradientId})`} />
          <path d={spark.line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Link>
  );
}
