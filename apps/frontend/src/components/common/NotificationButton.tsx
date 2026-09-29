"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface NotificationButtonProps {
  hasUnread?: boolean;
}

export default function NotificationButton({
  hasUnread: propHasUnread,
}: NotificationButtonProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiFetch("/api/student/notifications/unread-count");
      if (res.ok) {
        const json = await res.json();
        if (json.success && typeof json.data?.unreadCount === "number") {
          setUnreadCount(json.data.unreadCount);
        }
      }
    } catch {
      // Graceful fallback without breaking header
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const handleUpdate = () => {
      fetchUnreadCount();
    };

    window.addEventListener("notifications-updated", handleUpdate);
    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
    };
  }, [fetchUnreadCount]);

  const handleClick = () => {
    router.push("/student/notifications");
  };

  const showIndicator =
    typeof propHasUnread === "boolean" ? propHasUnread : unreadCount > 0;

  return (
    <button
      className="icon-button notification-button"
      aria-label={
        showIndicator
          ? `Notifications (${unreadCount} unread)`
          : "Notifications"
      }
      onClick={handleClick}
      type="button"
      title={
        showIndicator
          ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
          : "Notifications"
      }
    >
      <span className="button-icon">🔔</span>

      {showIndicator && <span className="notification-indicator" />}
    </button>
  );
}