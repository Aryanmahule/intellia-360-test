"use client";

import React from "react";
import Link from "next/link";
import type { AdminActivityEntry } from "@/data/admin/useAdminDashboard";
import { formatRelativeTime } from "@/data/admin/useAdminDashboard";
import {
  UserPlus,
  Building2,
  BookPlus,
  FolderKanban,
  CreditCard,
  Activity,
  ArrowRight,
} from "@/components/admin/icons";

const kindMeta: Record<
  AdminActivityEntry["kind"],
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  user: { Icon: UserPlus, tone: "violet" },
  school: { Icon: Building2, tone: "amber" },
  course: { Icon: BookPlus, tone: "emerald" },
  content: { Icon: FolderKanban, tone: "blue" },
  payment: { Icon: CreditCard, tone: "rose" },
};

interface ActivityCardProps {
  activity: AdminActivityEntry[];
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <section className="admin-card admin-activity-card">
      <header className="admin-card-header">
        <h3 className="admin-card-title">Recent Activity</h3>
        <Link href="/admin/reports" className="admin-link-action">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {activity.length === 0 ? (
        <div className="admin-empty-state">
          <Activity className="w-6 h-6" />
          <p className="admin-empty-title">Nothing has happened yet</p>
          <p className="admin-empty-text">
            Registrations, new courses and payments will show up here.
          </p>
        </div>
      ) : (
        <ul className="admin-activity-list">
          {activity.map((entry) => {
            const { Icon, tone } = kindMeta[entry.kind];
            return (
              <li key={entry.id}>
                <Link href={entry.href} className="admin-activity-row">
                  <span className={`admin-activity-icon tone-${tone}`}>
                    <Icon className="w-4 h-4" />
                  </span>

                  <span className="admin-activity-body">
                    <span className="admin-activity-title">{entry.title}</span>
                    <span className="admin-activity-subtitle">{entry.subtitle}</span>
                  </span>

                  <time className="admin-activity-time" dateTime={entry.at}>
                    {formatRelativeTime(entry.at)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
