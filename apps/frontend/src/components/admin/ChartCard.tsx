"use client";

import React, { useState } from "react";
import { platformGrowthData, userDistributionData, monthlyRevenueData } from "@/data/admin/charts";
import { TrendingUp, Users, IndianRupee } from "@/components/admin/icons";

interface ChartCardProps {
  type: "growth" | "distribution" | "revenue";
  title: string;
}

const EMPTY_COPY: Record<ChartCardProps["type"], { Icon: typeof TrendingUp; message: string }> = {
  growth: { Icon: TrendingUp, message: "No growth data yet" },
  distribution: { Icon: Users, message: "No user distribution data yet" },
  revenue: { Icon: IndianRupee, message: "No revenue data yet" },
};

function EmptyChartState({ type }: { type: ChartCardProps["type"] }) {
  const { Icon, message } = EMPTY_COPY[type];
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold text-slate-500">{message}</p>
      <p className="max-w-[220px] text-xs text-slate-400">
        This chart will populate automatically as real platform data comes in.
      </p>
    </div>
  );
}

export default function ChartCard({ type, title }: ChartCardProps) {
  const [filter, setFilter] = useState("This Month");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  const isEmpty =
    (type === "growth" && platformGrowthData.length === 0) ||
    (type === "distribution" && userDistributionData.length === 0) ||
    (type === "revenue" && monthlyRevenueData.length === 0);

  const distributionTotal = userDistributionData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="admin-card relative">
      <div className="admin-card-header">
        <h3 className="admin-card-title">{title}</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none cursor-pointer transition-all duration-200 hover:border-orange-200"
        >
          <option>This Month</option>
          <option>Last Quarter</option>
          <option>This Year</option>
        </select>
      </div>

      {isEmpty ? (
        <EmptyChartState type={type} />
      ) : (
        <>
      {/* 1. Line/Area Chart with Y-axis labels and Custom Tooltip */}
      {type === "growth" && (
        <div className="w-full relative">
          <div className="h-52 w-full relative pt-2">
            <svg viewBox="0 0 520 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background grid lines */}
              <line x1="30" y1="40" x2="510" y2="40" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="30" y1="90" x2="510" y2="90" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="30" y1="140" x2="510" y2="140" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="30" y1="170" x2="510" y2="170" stroke="#e2e8f0" />

              {/* Y Axis Labels */}
              <text x="20" y="173" className="text-[10px] font-bold fill-slate-400 text-right" textAnchor="end">0</text>
              <text x="20" y="143" className="text-[10px] font-bold fill-slate-400 text-right" textAnchor="end">3k</text>
              <text x="20" y="93" className="text-[10px] font-bold fill-slate-400 text-right" textAnchor="end">7k</text>
              <text x="20" y="43" className="text-[10px] font-bold fill-slate-400 text-right" textAnchor="end">11k</text>
              <text x="20" y="10" className="text-[10px] font-bold fill-slate-400 text-right" textAnchor="end">15k</text>

              {/* Chart Area */}
              <polygon
                points="30,170 30,140 78,110 126,120 174,80 222,95 270,50 318,35 366,45 414,20 462,15 510,5 510,170"
                fill="url(#orangeGradient)"
              />

              {/* Chart Line */}
              <path
                d="M 30 140 L 78 110 L 126 120 L 174 80 L 222 95 L 270 50 L 318 35 L 366 45 L 414 20 L 462 15 L 510 5"
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Active Point (last node) */}
              <circle cx="510" cy="5" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="2.5" />

              {/* Interactive Hover Nodes */}
              {platformGrowthData.map((pt, index) => {
                const totalPoints = platformGrowthData.length;
                const chartWidth = 480; // 510 - 30
                const x = 30 + (index / (totalPoints - 1)) * chartWidth;
                const yValues = [140, 110, 120, 80, 95, 50, 35, 45, 20, 15, 5];
                const y = yValues[index];

                return (
                  <g key={index} className="group cursor-pointer">
                    {/* Hover hotspot */}
                    <circle
                      cx={x}
                      cy={y}
                      r="16"
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint({ x, y, label: pt.label, value: pt.value })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Visual node on hover */}
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      className="fill-orange-500 stroke-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      strokeWidth="2"
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 pl-[25px] pr-1">
            {platformGrowthData.map((pt, i) => (
              <span key={i}>{pt.label.split(" ")[1]}</span>
            ))}
          </div>

          {/* HTML Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-slate-900 text-white text-[11px] font-bold p-2 rounded-lg shadow-xl pointer-events-none z-10 border border-slate-800"
              style={{
                left: `${(hoveredPoint.x / 520) * 100}%`,
                top: `${(hoveredPoint.y / 200) * 100 - 15}px`,
                transform: "translate(-50%, -100%)",
                transition: "left 0.1s ease, top 0.1s ease",
              }}
            >
              <div className="text-slate-300 font-semibold">{hoveredPoint.label}</div>
              <div className="text-orange-400 font-extrabold text-[12px]">{hoveredPoint.value.toLocaleString()} Users</div>
            </div>
          )}
        </div>
      )}

      {/* 2. Donut Distribution Chart (Optimized size and full legends) */}
      {type === "distribution" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
          {/* Centered Donut, smaller to avoid huge gaps */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="3.5"
              />
              {/* Dynamic Slices from data */}
              {(() => {
                let cumulativePercent = 0;
                return userDistributionData.map((item) => {
                  const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                  const strokeDashoffset = -cumulativePercent;
                  cumulativePercent += item.percentage;
                  return (
                    <circle
                      key={item.label}
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="4"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300 hover:stroke-[5px]"
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-extrabold text-slate-900 leading-none">{distributionTotal.toLocaleString()}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Total Users</span>
            </div>
          </div>

          {/* Clean Legend list */}
          <div className="flex-1 w-full flex flex-col gap-2">
            {userDistributionData.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-extrabold">{item.percentage}%</span>
                  <span className="text-slate-400 text-[10px] font-medium">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Bar Chart (Revenue) */}
      {type === "revenue" && (
        <div className="w-full">
          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
            {monthlyRevenueData.map((bar) => {
              const heightPct = Math.round((bar.value / 30) * 100);
              return (
                <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-700">₹{bar.value}L</span>
                  <div className="w-full bg-slate-50 rounded-t-md h-28 flex items-end border border-slate-100/50">
                    <div
                      className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-md transition-all duration-300 hover:brightness-105"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
