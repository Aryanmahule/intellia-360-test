"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminDashboardData, RangeKey } from "@intellia360/shared/types/api/admin-dashboard";
import { apiFetch } from "@/lib/api";

export type { AdminDashboardData, RangeKey };
export type {
  AdminKpi,
  AdminOverviewSeries,
  AdminOverviewTile,
  AdminDistributionSlice,
  AdminTopCourse,
  AdminActivityEntry,
  AdminHealthItem,
} from "@intellia360/shared/types/api/admin-dashboard";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
];

/**
 * Loads the whole dashboard in a single request.
 *
 * Call this ONCE per page and pass the result down — every widget used to run
 * its own hook instance, which meant the same aggregate query ran three times
 * on every mount. There is no polling: data reloads only when the admin
 * changes the range or presses Refresh.
 */
export function useAdminDashboard(initialRange: RangeKey = "30d") {
  const [range, setRangeState] = useState<RangeKey>(initialRange);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await apiFetch(`/api/admin/dashboard?range=${range}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to load dashboard data.");
        }

        setData(json.data as AdminDashboardData);
        setError(null);
      } catch (err) {
        // An aborted request means a newer one already superseded it.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => controller.abort();
  }, [range, reloadToken]);

  // Loading flags are raised from the interaction that causes the reload, so
  // the effect itself never triggers a synchronous cascading render.
  const setRange = useCallback(
    (next: RangeKey) => {
      if (next === range) return;
      setIsRefreshing(true);
      setRangeState(next);
    },
    [range]
  );

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  return { data, range, setRange, isLoading, isRefreshing, error, refresh };
}

/* ─── Display helpers ─────────────────────────────────────────────────────── */

export function formatCount(value: number): string {
  return (Number(value) || 0).toLocaleString("en-IN");
}

/** "2 min ago" / "3 hr ago" / "12 Aug" — for activity timestamps. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMinutes = Math.round((Date.now() - then) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d ago`;

  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

/** Turns "grade7" into "Grade 7" for display. */
export function formatGrade(grade: string): string {
  const match = /^grade(\d+)$/i.exec(grade);
  return match ? `Grade ${match[1]}` : grade;
}

/* ─── Count-up animation ──────────────────────────────────────────────────── */

/**
 * Animates a number from 0 up to `target`. Zero renders instantly (nothing to
 * animate) and reduced-motion preferences skip straight to the final value.
 */
export function useCountUp(target: number, durationMs = 800): number {
  const safeTarget = Number(target) || 0;
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (safeTarget === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      frameRef.current = requestAnimationFrame(() => setValue(safeTarget));
    } else {
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(safeTarget * eased));
        if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [safeTarget, durationMs]);

  return safeTarget === 0 ? 0 : value;
}
