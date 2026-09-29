"use client";

import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import KPICard from "@/components/admin/KPICard";
import LearningOverviewCard from "@/components/admin/LearningOverviewCard";
import UserDistributionCard from "@/components/admin/UserDistributionCard";
import TopCoursesCard from "@/components/admin/TopCoursesCard";
import PlatformHealth from "@/components/admin/PlatformHealth";
import { useAdminDashboard, RANGE_OPTIONS, RangeKey } from "@/data/admin/useAdminDashboard";
import { Calendar, ChevronDown, AlertTriangle } from "@/components/admin/icons";

export default function AdminAnalyticsPage() {
  // One request serves the whole page — the same endpoint the dashboard uses,
  // so switching between the two pages hits a warm route rather than a
  // different set of aggregate queries.
  const { data, range, setRange, isLoading, isRefreshing, error, refresh } = useAdminDashboard();

  return (
    <AdminLayout>
      <div className="admin-dashboard-page">
        <header className="admin-page-head">
          <div>
            <div className="admin-breadcrumb">Admin / Analytics</div>
            <h1 className="admin-page-title">Platform Analytics</h1>
            <p className="admin-page-subtitle">
              Learner growth, engagement and content performance across the platform.
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
          </div>
        </header>

        {error && (
          <div className="admin-error-banner" role="alert">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <strong>Couldn&apos;t load analytics</strong>
              <span>{error}</span>
            </div>
            <button type="button" className="admin-secondary-button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {isLoading && !data ? (
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
          </div>
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
              <UserDistributionCard
                total={data.distribution.total}
                slices={data.distribution.slices}
              />
              <PlatformHealth health={data.health} />
            </section>

            <section className="admin-dashboard-row">
              <TopCoursesCard courses={data.topCourses} />
            </section>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
