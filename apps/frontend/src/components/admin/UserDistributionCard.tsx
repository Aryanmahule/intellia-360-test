"use client";

import React from "react";
import Link from "next/link";
import type { AdminDistributionSlice } from "@/data/admin/useAdminDashboard";
import { formatCount } from "@/data/admin/useAdminDashboard";
import { Users } from "@/components/admin/icons";

interface UserDistributionCardProps {
  total: number;
  slices: AdminDistributionSlice[];
}

export default function UserDistributionCard({ total, slices }: UserDistributionCardProps) {
  // Each arc starts where the previous one ended — precomputed so the render
  // pass stays free of mutation.
  const arcs = slices.reduce<{ slice: AdminDistributionSlice; offset: number }[]>(
    (acc, slice) => [
      ...acc,
      { slice, offset: acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].slice.percent },
    ],
    []
  );

  return (
    <section className="admin-card admin-distribution-card">
      <header className="admin-card-header">
        <div>
          <h3 className="admin-card-title">User Distribution</h3>
          <p className="admin-card-subtitle">Accounts by role</p>
        </div>
      </header>

      {total === 0 ? (
        <div className="admin-empty-state">
          <Users className="w-6 h-6" />
          <p className="admin-empty-title">No accounts yet</p>
          <p className="admin-empty-text">The split by role appears once people register.</p>
        </div>
      ) : (
        <div className="admin-distribution-body">
          <div className="admin-donut">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle className="admin-donut-track" cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" />
              {arcs.map(({ slice, offset }) => (
                <circle
                  key={slice.id}
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="4"
                  strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
                  strokeDashoffset={-offset}
                />
              ))}
            </svg>

            <div className="admin-donut-center">
              <span className="admin-donut-label">Total</span>
              <strong className="admin-donut-value">{formatCount(total)}</strong>
            </div>
          </div>

          <ul className="admin-distribution-legend">
            {slices.map((slice) => (
              <li key={slice.id}>
                <Link href={slice.href} className="admin-distribution-row">
                  <span className="admin-legend-dot" style={{ background: slice.color }} />
                  <span className="admin-distribution-label">{slice.label}</span>
                  <span className="admin-distribution-value">
                    {formatCount(slice.count)}
                    <span className="admin-distribution-percent">({slice.percent}%)</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
