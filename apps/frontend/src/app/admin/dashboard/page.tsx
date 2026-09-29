"use client";

import React, { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import KPICard from "@/components/admin/KPICard";
import LearningOverviewCard from "@/components/admin/LearningOverviewCard";
import ActivityCard from "@/components/admin/ActivityCard";
import PlatformHealth from "@/components/admin/PlatformHealth";
import TopCoursesCard from "@/components/admin/TopCoursesCard";
import UserDistributionCard from "@/components/admin/UserDistributionCard";
import QuickActionCard from "@/components/admin/QuickActionCard";
import { useAuth } from "@/context/AuthContext";
import { useAdminDashboard, RANGE_OPTIONS, RangeKey } from "@/data/admin/useAdminDashboard";
import {
  Calendar,
  ChevronDown,
  Download,
  RefreshCw,
  AlertTriangle,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

function DashboardSkeleton() {
  return (
    <div className="admin-dashboard-skeleton" aria-hidden="true">
      <div className="admin-skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-skeleton admin-skeleton-kpi" />
        ))}
      </div>
      <div className="admin-skeleton-row">
        <div className="admin-skeleton admin-skeleton-chart" />
        <div className="admin-skeleton admin-skeleton-panel" />
        <div className="admin-skeleton admin-skeleton-panel" />
      </div>
      <div className="admin-skeleton-row">
        <div className="admin-skeleton admin-skeleton-panel" />
        <div className="admin-skeleton admin-skeleton-panel" />
        <div className="admin-skeleton admin-skeleton-panel" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, range, setRange, isLoading, isRefreshing, error, refresh } = useAdminDashboard();
  const [isExporting, setIsExporting] = useState(false);

  const adminName = user?.name?.trim() || "Admin";

  /** Reuses the existing ADMIN-only CSV export endpoint. */
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const res = await apiFetch("/api/admin/reports/export?type=all");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `intellia360-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Could not generate the report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-dashboard-page">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <header className="admin-page-head">
          <div>
            <h1 className="admin-welcome-title">Welcome back, {adminName}! 👋</h1>
            <p className="admin-welcome-sub">
              Here&apos;s what&apos;s happening on Intellia360 today.
            </p>
          </div>

          <div className="admin-page-head-actions">
            <div className="admin-range-picker">
              <Calendar className="w-4 h-4" />
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                aria-label="Reporting period"
                disabled={isLoading}
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4" />
            </div>

            <button
              type="button"
              className="admin-icon-btn"
              onClick={refresh}
              disabled={isLoading || isRefreshing}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4${isRefreshing ? " is-spinning" : ""}`} />
            </button>

            <button
              type="button"
              className="admin-primary-button"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Preparing…" : "Export Report"}
            </button>
          </div>
        </header>

        {data && (
          <p className="admin-range-caption">
            Showing <strong>{data.range.label}</strong> · compared with {data.range.previousLabel}
          </p>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="admin-error-banner" role="alert">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <strong>Couldn&apos;t load the dashboard</strong>
              <span>{error}</span>
            </div>
            <button type="button" className="admin-secondary-button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        {isLoading && !data ? (
          <DashboardSkeleton />
        ) : data ? (
          <div className={`admin-dashboard-body${isRefreshing ? " is-refreshing" : ""}`}>
            <section className="admin-kpi-grid" aria-label="Platform key metrics">
              {data.kpis.map((kpi) => (
                <KPICard key={kpi.id} kpi={kpi} comparisonLabel={data.range.previousLabel} />
              ))}
            </section>

            <section className="admin-dashboard-row primary-row">
              <LearningOverviewCard
                series={data.series}
                tiles={data.overviewTiles}
                range={range}
                onRangeChange={setRange}
                isRefreshing={isRefreshing}
              />
              <ActivityCard activity={data.activity} />
              <PlatformHealth health={data.health} />
            </section>

            <section className="admin-dashboard-row secondary-row">
              <TopCoursesCard courses={data.topCourses} />
              <UserDistributionCard
                total={data.distribution.total}
                slices={data.distribution.slices}
              />
              <QuickActionCard />
            </section>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
