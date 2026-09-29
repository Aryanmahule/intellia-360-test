"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useStudentContext } from "@/context/StudentContext";
import "./notification.css";
import { apiFetch } from "@/lib/api";

export type NotificationType =
  | "achievement"
  | "lesson"
  | "quiz"
  | "streak"
  | "xp"
  | "announcement";

export type TabKey = "all" | "unread" | "achievements" | "learning";

export interface StudentNotification {
  id: string;
  type: NotificationType;
  tabCategory: "achievements" | "learning" | "announcements";
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  categoryTag: string;
  actionUrl?: string;
  actionText?: string;
}

export default function StudentNotificationsPage() {
  const { currentGrade } = useStudentContext();

  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real notifications from database
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch("/api/student/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
        }
      }
    } catch (e) {
      console.error("Failed to load notifications from database", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Counts
  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const achievements = notifications.filter((n) => n.tabCategory === "achievements").length;
    const learning = notifications.filter((n) => n.tabCategory === "learning").length;
    return {
      all: notifications.length,
      unread,
      achievements,
      learning,
    };
  }, [notifications]);

  // Filtered notifications
  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "unread") return !n.isRead;
      if (activeTab === "achievements") return n.tabCategory === "achievements";
      if (activeTab === "learning") return n.tabCategory === "learning";
      return true;
    });
  }, [notifications, activeTab]);

  // Actions
  const handleMarkAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target && target.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }

    try {
      await apiFetch(`/api/student/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleToggleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const nextIsRead = !target.isRead;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: nextIsRead } : n))
    );
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }

    try {
      await apiFetch(`/api/student/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: nextIsRead }),
      });
    } catch (e) {
      console.error("Failed to toggle notification read status", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }

    try {
      await apiFetch("/api/student/notifications/read-all", {
        method: "PATCH",
      });
    } catch (e) {
      console.error("Failed to mark all notifications as read", e);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }

    try {
      await apiFetch(`/api/student/notifications/${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      setNotifications([]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }

      try {
        await apiFetch("/api/student/notifications", {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to clear notifications", e);
      }
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  const unreadPercent =
    notifications.length > 0
      ? Math.round((counts.unread / notifications.length) * 100)
      : 0;

  const typeCounts = useMemo(() => {
    return notifications.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
  }, [notifications]);

  return (
    <div className="student-notifications-container">
      {/* ═════════════════════════════════════════════
          1. TOP HEADER CARD
      ═════════════════════════════════════════════ */}
      <div className="sn-header-card">
        <div className="sn-header-left">
          <div className="sn-title-row">
            <h1 className="sn-page-title">Notifications</h1>
            {counts.unread > 0 ? (
              <span className="sn-unread-badge">
                ● {counts.unread} {counts.unread === 1 ? "New Notification" : "New Notifications"}
              </span>
            ) : (
              <span className="sn-unread-badge" style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }}>
                ✓ All caught up
              </span>
            )}
          </div>
          <p className="sn-page-subtitle">
            Stay updated with your learning activities, rewards, and achievements
          </p>
        </div>

        <div className="sn-header-actions">
          <button
            type="button"
            className="sn-btn sn-btn-primary"
            onClick={handleMarkAllAsRead}
            disabled={counts.unread === 0}
          >
            <span>✓</span>
            <span>Mark all as read</span>
          </button>

          <button
            type="button"
            className="sn-btn sn-btn-secondary"
            onClick={handleRefresh}
            title="Refresh notifications"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              className="sn-btn sn-btn-danger-text"
              onClick={handleClearAll}
              title="Clear all notifications"
            >
              <span>🗑️</span>
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          2. NOTIFICATION COMMAND CENTER
      ═════════════════════════════════════════════ */}
      <section className="sn-command-grid">
        <div className="sn-command-card sn-command-main">
          <div className="sn-command-orb" aria-hidden="true">
            <div className="sn-command-orb-core">
              <span>{counts.unread}</span>
            </div>
            <div className="sn-command-orbit orbit-a" />
            <div className="sn-command-orbit orbit-b" />
          </div>
          <div className="sn-command-copy">
            <span className="sn-section-kicker">Learning signal</span>
            <h2>{counts.unread > 0 ? "You have new updates" : "You're all caught up"}</h2>
            <p>
              {counts.unread > 0
                ? `${counts.unread} notification${counts.unread === 1 ? "" : "s"} are waiting for your attention.`
                : "Your notification center is clear. Keep learning to unlock new updates."}
            </p>
            <div className="sn-command-progress">
              <span style={{ width: `${100 - unreadPercent}%` }} />
            </div>
            <small>{100 - unreadPercent}% of your feed is already read</small>
          </div>
        </div>

        <div className="sn-mini-stat sn-mini-purple">
          <span className="sn-mini-icon">XP</span>
          <div>
            <small>Achievements</small>
            <strong>{typeCounts.achievement || 0}</strong>
            <span>milestones</span>
          </div>
        </div>

        <div className="sn-mini-stat sn-mini-orange">
          <span className="sn-mini-icon">QZ</span>
          <div>
            <small>Quiz Updates</small>
            <strong>{typeCounts.quiz || 0}</strong>
            <span>notifications</span>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════
          3. FILTER TABS
      ═════════════════════════════════════════════ */}
      <div className="sn-tabs-container">
        <div className="sn-tabs-list">
          <button
            type="button"
            className={`sn-tab-button ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>All</span>
            <span className="sn-tab-pill">{counts.all}</span>
          </button>

          <button
            type="button"
            className={`sn-tab-button ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            <span>Unread</span>
            <span
              className={`sn-tab-pill ${counts.unread > 0 ? "unread-highlight" : ""
                }`}
            >
              {counts.unread}
            </span>
          </button>

          <button
            type="button"
            className={`sn-tab-button ${activeTab === "achievements" ? "active" : ""}`}
            onClick={() => setActiveTab("achievements")}
          >
            <span>Achievements</span>
            <span className="sn-tab-pill">{counts.achievements}</span>
          </button>

          <button
            type="button"
            className={`sn-tab-button ${activeTab === "learning" ? "active" : ""}`}
            onClick={() => setActiveTab("learning")}
          >
            <span>Learning</span>
            <span className="sn-tab-pill">{counts.learning}</span>
          </button>
        </div>

        <div style={{ fontSize: "0.78rem", color: "#9ca3af", paddingRight: 8 }}>
          Grade: <strong style={{ color: "#1e1b4b" }}>{currentGrade.toUpperCase()}</strong>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          4. NOTIFICATIONS FEED PANEL
      ═════════════════════════════════════════════ */}
      <div className="sn-feed-panel">
        <div className="sn-feed-header">
          <span className="sn-feed-count-text">
            Showing {filteredList.length} {filteredList.length === 1 ? "notification" : "notifications"}
          </span>
          {activeTab !== "all" && (
            <button
              type="button"
              className="sn-clear-filter"
              onClick={() => setActiveTab("all")}
            >
              Clear filter
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="sn-empty-state" style={{ padding: "48px 24px" }}>
            <div className="sn-empty-icon-circle">⏳</div>
            <h3 className="sn-empty-title">Loading notifications...</h3>
            <p className="sn-empty-desc">Fetching your latest learning updates.</p>
          </div>
        ) : filteredList.length === 0 ? (
          /* ── Empty State ── */
          <div className="sn-empty-state">
            <div className="sn-empty-icon-circle">
              {activeTab === "unread" ? "🎉" : activeTab === "achievements" ? "🏆" : "🔔"}
            </div>
            <h3 className="sn-empty-title">
              {activeTab === "unread"
                ? "You're all caught up!"
                : `No notifications in ${activeTab}`}
            </h3>
            <p className="sn-empty-desc">
              {activeTab === "unread"
                ? "Great job! You have read all your notifications. New learning updates and achievements will show up here."
                : "There are no notifications matching this category right now. Keep learning to earn new updates!"}
            </p>
            {notifications.length === 0 ? (
              <button
                type="button"
                className="sn-btn sn-btn-primary"
                style={{ marginTop: 8 }}
                onClick={handleRefresh}
              >
                🔄 Refresh Notifications
              </button>
            ) : (
              <button
                type="button"
                className="sn-btn sn-btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => setActiveTab("all")}
              >
                View All Notifications ({counts.all})
              </button>
            )}
          </div>
        ) : (
          /* ── Notification List ── */
          <div className="sn-feed-list">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`sn-card sn-type-${item.type} ${!item.isRead ? "unread" : ""}`}
                onClick={() => handleMarkAsRead(item.id)}
              >
                {/* Category Icon */}
                <div
                  className="sn-card-icon-wrapper"
                  style={{ background: item.iconBg }}
                >
                  {item.icon}
                </div>

                {/* Content */}
                <div className="sn-card-content">
                  <div className="sn-card-top-row">
                    <div className="sn-card-title-block">
                      {!item.isRead && <span className="sn-unread-dot" title="Unread" />}
                      <h4 className="sn-card-title">{item.title}</h4>
                      <span className="sn-card-category-tag">{item.categoryTag}</span>
                    </div>
                    <span className="sn-card-timestamp">{item.timestamp}</span>
                  </div>

                  <p className="sn-card-description">{item.description}</p>

                  <div className="sn-card-footer">
                    <span className="sn-card-type-label">
                      {item.type.replace("_", " ")}
                    </span>
                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        className="sn-card-action-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(item.id);
                        }}
                      >
                        {item.actionText || "View details →"}
                      </Link>
                    )}

                    <div className="sn-card-item-actions">
                      <button
                        type="button"
                        className="sn-icon-btn"
                        title={item.isRead ? "Mark as unread" : "Mark as read"}
                        onClick={(e) => handleToggleRead(item.id, e)}
                      >
                        {item.isRead ? "✉️" : "✓"}
                      </button>

                      <button
                        type="button"
                        className="sn-icon-btn delete"
                        title="Delete notification"
                        onClick={(e) => handleDelete(item.id, e)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
