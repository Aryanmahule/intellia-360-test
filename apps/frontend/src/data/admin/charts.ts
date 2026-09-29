import { apiFetch } from "@/lib/api";
// src/data/admin/charts.ts

export interface ChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface UserDistributionItem {
  label: string;
  percentage: number;
  count: number;
  color: string;
}

export interface LeaderboardItem {
  id: string;
  rank: number;
  name: string;
  students: number;
  completion: number;
  avatar?: string;
  badge?: string;
}

/* ============================================================
   ZERO / EMPTY STATE
============================================================ */

export const platformGrowthData: ChartPoint[] = [];

export const userDistributionData: UserDistributionItem[] = [];

export const monthlyRevenueData: ChartPoint[] = [];

export const topSchoolsLeaderboard: LeaderboardItem[] = [];

/* ============================================================
   API CONFIG
============================================================ */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

/* ============================================================
   SAFE API REQUEST
============================================================ */

async function apiRequest<T>(
  endpoint: string,
  fallback: T
): Promise<T> {
  try {
    const response = await apiFetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.warn(
        `Admin API failed: ${endpoint} (${response.status})`
      );

      return fallback;
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.warn(
      `Admin API unavailable: ${endpoint}`,
      error
    );

    return fallback;
  }
}

/* ============================================================
   PLATFORM GROWTH
============================================================ */

export async function fetchPlatformGrowth(): Promise<
  ChartPoint[]
> {
  const data = await apiRequest<ChartPoint[]>(
    "/api/admin/analytics/platform-growth",
    []
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    label: String(item.label ?? ""),
    value:
      typeof item.value === "number"
        ? item.value
        : 0,
    secondaryValue:
      typeof item.secondaryValue === "number"
        ? item.secondaryValue
        : undefined,
  }));
}

/* ============================================================
   USER DISTRIBUTION
============================================================ */

export async function fetchUserDistribution(): Promise<
  UserDistributionItem[]
> {
  const data = await apiRequest<
    UserDistributionItem[]
  >(
    "/api/admin/analytics/user-distribution",
    []
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    label: String(item.label ?? ""),
    percentage:
      typeof item.percentage === "number"
        ? item.percentage
        : 0,
    count:
      typeof item.count === "number"
        ? item.count
        : 0,
    color: String(
      item.color ?? "#f97316"
    ),
  }));
}

/* ============================================================
   MONTHLY REVENUE
============================================================ */

export async function fetchMonthlyRevenue(): Promise<
  ChartPoint[]
> {
  const data = await apiRequest<ChartPoint[]>(
    "/api/admin/analytics/monthly-revenue",
    []
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    label: String(item.label ?? ""),
    value:
      typeof item.value === "number"
        ? item.value
        : 0,
    secondaryValue:
      typeof item.secondaryValue === "number"
        ? item.secondaryValue
        : undefined,
  }));
}

/* ============================================================
   TOP SCHOOLS
============================================================ */

export async function fetchTopSchools(): Promise<
  LeaderboardItem[]
> {
  const data = await apiRequest<
    LeaderboardItem[]
  >(
    "/api/admin/analytics/top-schools",
    []
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item, index) => ({
    id: String(
      item.id ?? `school-${index + 1}`
    ),

    rank:
      typeof item.rank === "number"
        ? item.rank
        : index + 1,

    name: String(item.name ?? ""),

    students:
      typeof item.students === "number"
        ? item.students
        : 0,

    completion:
      typeof item.completion === "number"
        ? item.completion
        : 0,

    avatar: item.avatar,
    badge: item.badge,
  }));
}