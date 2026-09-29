"use client";

import React, { useMemo, useState } from "react";
import type {
  AdminOverviewSeries,
  AdminOverviewTile,
  RangeKey,
} from "@/data/admin/useAdminDashboard";
import { RANGE_OPTIONS } from "@/data/admin/useAdminDashboard";
import {
  BookOpenCheck,
  ClipboardCheck,
  Award,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "@/components/admin/icons";

const tileIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpenCheck,
  ClipboardCheck,
  Award,
  Zap,
};

const SERIES_META = [
  { key: "students", label: "Students", color: "#7c5cff" },
  { key: "teachers", label: "Teachers", color: "#3b82f6" },
  { key: "lessonsCompleted", label: "Lessons Completed", color: "#22c55e" },
] as const;

const VIEW_W = 720;
const VIEW_H = 220;
const PAD_L = 46;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26;

interface LearningOverviewCardProps {
  series: AdminOverviewSeries;
  tiles: AdminOverviewTile[];
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  isRefreshing: boolean;
}

/**
 * Picks a gridline step that keeps every axis label a whole number — a naive
 * "max / 4" produces labels like 12.5 that then round to 13 and 38.
 */
function niceScale(dataMax: number): { max: number; gridValues: number[] } {
  const target = Math.max(dataMax, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalised = target / magnitude;
  const step = Math.max(
    1,
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude
  );

  const max = Math.max(step, Math.ceil(dataMax / step) * step);

  const gridValues: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) gridValues.push(value);

  return { max, gridValues };
}

function formatAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
}

export default function LearningOverviewCard({
  series,
  tiles,
  range,
  onRangeChange,
  isRefreshing,
}: LearningOverviewCardProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const count = series.labels.length;
    if (count === 0) return null;

    const allValues = [...series.students, ...series.teachers, ...series.lessonsCompleted];
    const { max, gridValues } = niceScale(Math.max(1, ...allValues));

    const innerW = VIEW_W - PAD_L - PAD_R;
    const innerH = VIEW_H - PAD_T - PAD_B;
    const stepX = count > 1 ? innerW / (count - 1) : 0;

    const toX = (index: number) => PAD_L + index * stepX;
    const toY = (value: number) => PAD_T + innerH - (value / max) * innerH;

    const paths = SERIES_META.map((meta) => {
      const values = series[meta.key];
      const line = values
        .map((value, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(1)} ${toY(value).toFixed(1)}`)
        .join(" ");
      const area = `${line} L ${toX(count - 1).toFixed(1)} ${PAD_T + innerH} L ${PAD_L} ${PAD_T + innerH} Z`;
      return { ...meta, line, area, values };
    });

    // Keep the x-axis readable: show at most 7 labels, evenly spaced.
    const labelStep = Math.max(1, Math.ceil(count / 7));
    const xLabels = series.labels
      .map((label, index) => ({ label, index }))
      .filter(({ index }) => index % labelStep === 0 || index === count - 1);

    return { count, max, innerH, toX, toY, paths, gridValues, xLabels };
  }, [series]);

  const hasData = chart !== null && chart.count > 0;

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!chart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = ratio * VIEW_W;
    const index = Math.round((x - PAD_L) / ((VIEW_W - PAD_L - PAD_R) / Math.max(1, chart.count - 1)));
    setHoverIndex(Math.max(0, Math.min(chart.count - 1, index)));
  };

  return (
    <section className="admin-card admin-overview-card">
      <header className="admin-card-header">
        <div>
          <h3 className="admin-card-title">Learning Overview</h3>
          <p className="admin-card-subtitle">
            Cumulative growth across the selected period
          </p>
        </div>

        <div className="admin-select-wrapper">
          <select
            className="admin-select"
            value={range}
            onChange={(e) => onRangeChange(e.target.value as RangeKey)}
            aria-label="Chart period"
            disabled={isRefreshing}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="admin-select-icon" />
        </div>
      </header>

      <ul className="admin-chart-legend">
        {SERIES_META.map((meta) => (
          <li key={meta.key}>
            <span className="admin-legend-dot" style={{ background: meta.color }} />
            {meta.label}
          </li>
        ))}
      </ul>

      {!hasData ? (
        <div className="admin-empty-state">
          <TrendingUp className="w-6 h-6" />
          <p className="admin-empty-title">No activity in this period</p>
          <p className="admin-empty-text">
            Sign-ups and lesson completions will appear here as they happen.
          </p>
        </div>
      ) : (
        <div className="admin-chart-frame">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="admin-chart-svg"
            preserveAspectRatio="none"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
            role="img"
            aria-label="Cumulative students, teachers and lessons completed"
          >
            <defs>
              {chart.paths.map((p) => (
                <linearGradient key={p.key} id={`overview-fill-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={p.color} stopOpacity="0.20" />
                  <stop offset="100%" stopColor={p.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {chart.gridValues.map((value, i) => {
              const y = chart.toY(value);
              return (
                <g key={value + "-" + i}>
                  <line
                    x1={PAD_L}
                    x2={VIEW_W - PAD_R}
                    y1={y}
                    y2={y}
                    className="admin-chart-grid"
                    strokeDasharray={i === 0 ? undefined : "4 5"}
                  />
                  <text x={PAD_L - 10} y={y + 3.5} textAnchor="end" className="admin-chart-axis-label">
                    {formatAxis(value)}
                  </text>
                </g>
              );
            })}

            {chart.paths.map((p) => (
              <path key={`${p.key}-area`} d={p.area} fill={`url(#overview-fill-${p.key})`} />
            ))}

            {chart.paths.map((p) => (
              <path
                key={`${p.key}-line`}
                d={p.line}
                fill="none"
                stroke={p.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {hoverIndex !== null && (
              <g>
                <line
                  x1={chart.toX(hoverIndex)}
                  x2={chart.toX(hoverIndex)}
                  y1={PAD_T}
                  y2={PAD_T + chart.innerH}
                  className="admin-chart-cursor"
                />
                {chart.paths.map((p) => (
                  <circle
                    key={`${p.key}-dot`}
                    cx={chart.toX(hoverIndex)}
                    cy={chart.toY(p.values[hoverIndex])}
                    r="4"
                    fill={p.color}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>

          <div className="admin-chart-xaxis">
            {chart.xLabels.map(({ label, index }) => (
              <span
                key={`${label}-${index}`}
                style={{ left: `${(chart.toX(index) / VIEW_W) * 100}%` }}
              >
                {label}
              </span>
            ))}
          </div>

          {hoverIndex !== null && (
            <div
              className="admin-chart-tooltip"
              style={{ left: `${(chart.toX(hoverIndex) / VIEW_W) * 100}%` }}
            >
              <span className="admin-chart-tooltip-title">{series.labels[hoverIndex]}</span>
              {chart.paths.map((p) => (
                <span key={p.key} className="admin-chart-tooltip-row">
                  <span className="admin-legend-dot" style={{ background: p.color }} />
                  {p.label}
                  <strong>{p.values[hoverIndex].toLocaleString("en-IN")}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-overview-tiles">
        {tiles.map((tile) => {
          const Icon = tileIcons[tile.icon] ?? Award;
          const hasGrowth = tile.growthPercent !== null;
          const isUp = (tile.growthPercent ?? 0) >= 0;

          return (
            <div key={tile.id} className="admin-overview-tile">
              <span className="admin-overview-tile-icon">
                <Icon className="w-4 h-4" />
              </span>
              <div className="admin-overview-tile-body">
                <span className="admin-overview-tile-label">{tile.label}</span>
                <strong className="admin-overview-tile-value">{tile.value}</strong>
                {hasGrowth ? (
                  <span className={`admin-delta${isUp ? " is-up" : " is-down"}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(tile.growthPercent ?? 0)}%
                  </span>
                ) : (
                  <span className="admin-delta is-muted">
                    {tile.id === "dau" ? "today" : "this period"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
