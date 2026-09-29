"use client";

import React from "react";
import Link from "next/link";
import { quickActionCards, QuickAction } from "@/data/admin/quickActions";
import {
  BookPlus,
  Building2,
  FolderKanban,
  Users,
  GraduationCap,
  CreditCard,
  FileText,
  Settings,
} from "@/components/admin/icons";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookPlus,
  Building2,
  FolderKanban,
  Users,
  GraduationCap,
  CreditCard,
  FileText,
  Settings,
};

export default function QuickActionCard() {
  return (
    <section className="admin-card admin-quick-actions-card">
      <header className="admin-card-header">
        <h3 className="admin-card-title">Quick Actions</h3>
      </header>

      <div className="admin-quick-grid">
        {quickActionCards.map((action: QuickAction) => {
          const Icon = iconMap[action.icon] ?? Settings;
          return (
            <Link key={action.id} href={action.link} className={`admin-quick-tile tone-${action.tone}`}>
              <span className="admin-quick-icon">
                <Icon className="w-5 h-5" />
              </span>
              <span className="admin-quick-label">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
