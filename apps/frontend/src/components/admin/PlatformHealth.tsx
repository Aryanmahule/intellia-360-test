"use client";

import React from "react";
import Link from "next/link";
import type { AdminHealthItem } from "@/data/admin/useAdminDashboard";
import { ArrowRight, CheckCircle2, AlertTriangle, HelpCircle } from "@/components/admin/icons";

interface PlatformHealthProps {
  health: AdminHealthItem[];
}

const statusMeta: Record<
  AdminHealthItem["status"],
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  Operational: { Icon: CheckCircle2, tone: "ok" },
  Degraded: { Icon: AlertTriangle, tone: "warn" },
  "Not configured": { Icon: HelpCircle, tone: "muted" },
};

export default function PlatformHealth({ health }: PlatformHealthProps) {
  const operational = health.filter((item) => item.status === "Operational").length;
  const allGood = health.length > 0 && operational === health.length;
  const degraded = health.some((item) => item.status === "Degraded");

  return (
    <section className="admin-card admin-health-card">
      <header className="admin-card-header">
        <h3 className="admin-card-title">System Health</h3>
        <Link href="/admin/settings" className="admin-link-action">
          Manage <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <div className={`admin-health-hero${degraded ? " is-warn" : ""}`}>
        <span className="admin-health-shield" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M24 4 8 10v12c0 10 6.8 19.2 16 22 9.2-2.8 16-12 16-22V10L24 4Z"
              fill="url(#healthShield)"
            />
            <path
              d="m17 24 5 5 10-10"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="healthShield" x1="8" y1="4" x2="40" y2="44">
                <stop stopColor="#8b7cff" />
                <stop offset="1" stopColor="#5b4bdb" />
              </linearGradient>
            </defs>
          </svg>
        </span>

        <div>
          <strong className="admin-health-count">
            {operational}/{health.length}
          </strong>
          <span className="admin-health-caption">services operational</span>
        </div>
      </div>

      <ul className="admin-health-list">
        {health.map((item) => {
          const { Icon, tone } = statusMeta[item.status];
          return (
            <li key={item.id} className="admin-health-row">
              <span className={`admin-health-icon tone-${tone}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="admin-health-name">
                {item.name}
                <span className="admin-health-detail">{item.detail}</span>
              </span>
              <span className={`admin-health-status tone-${tone}`}>{item.status}</span>
            </li>
          );
        })}
      </ul>

      <p className="admin-health-footnote">
        {allGood
          ? "All configured systems are running smoothly."
          : degraded
            ? "One or more services need attention."
            : "Some integrations have no provider configured yet."}
      </p>
    </section>
  );
}
