/**
 * Response shape of GET /api/admin/dashboard.
 *
 * Shared by the backend route (app/api/admin/dashboard/route.ts) and the frontend that consumes it.
 */

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export interface AdminKpi {
  id: string;
  title: string;
  value: number;
  /** Period-over-period change, or null when no historical baseline exists. */
  growthPercent: number | null;
  icon: string;
  color: string;
  /** Sparkline points; empty when the metric has no time dimension. */
  series: number[];
  href: string;
}

export interface AdminOverviewSeries {
  labels: string[];
  students: number[];
  teachers: number[];
  lessonsCompleted: number[];
}

export interface AdminOverviewTile {
  id: string;
  label: string;
  value: string;
  growthPercent: number | null;
  icon: string;
}

export interface AdminDistributionSlice {
  id: string;
  label: string;
  count: number;
  percent: number;
  color: string;
  href: string;
}

export interface AdminTopCourse {
  id: string;
  title: string;
  grade: string;
  subject: string | null;
  students: number;
  lessons: number;
  completionPercent: number;
  status: string;
}

export interface AdminActivityEntry {
  id: string;
  kind: "user" | "school" | "course" | "content" | "payment";
  title: string;
  subtitle: string;
  at: string;
  href: string;
}

export interface AdminHealthItem {
  id: string;
  name: string;
  status: "Operational" | "Degraded" | "Not configured";
  detail: string;
}

export interface AdminDashboardData {
  range: {
    key: RangeKey;
    label: string;
    previousLabel: string;
    from: string;
    to: string;
  };
  kpis: AdminKpi[];
  series: AdminOverviewSeries;
  overviewTiles: AdminOverviewTile[];
  distribution: { total: number; slices: AdminDistributionSlice[] };
  topCourses: AdminTopCourse[];
  activity: AdminActivityEntry[];
  health: AdminHealthItem[];
  generatedAt: string;
}
