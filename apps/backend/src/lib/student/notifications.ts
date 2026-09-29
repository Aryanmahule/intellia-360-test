import { db } from "@/lib/db";

export type NotificationType =
  | "achievement"
  | "lesson"
  | "quiz"
  | "streak"
  | "xp"
  | "announcement";

export type TabCategory = "achievements" | "learning" | "announcements";

export interface StudentNotificationDTO {
  id: string;
  type: NotificationType;
  tabCategory: TabCategory;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  categoryTag: string;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  tabCategory?: TabCategory;
  icon?: string;
  iconBg?: string;
  title: string;
  description: string;
  categoryTag?: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Format a Date into a human-friendly relative time string
 * matching the Notification card format (e.g. "Just now", "15 minutes ago", "Yesterday").
 */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - target.getTime();

  if (diffInMs < 0) return "Just now";

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes === 1) return "1 minute ago";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours === 1) return "1 hour ago";
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Default visual metadata by notification type
 */
function getDefaultMetadata(type: NotificationType): {
  tabCategory: TabCategory;
  icon: string;
  iconBg: string;
  categoryTag: string;
} {
  switch (type) {
    case "achievement":
      return {
        tabCategory: "achievements",
        icon: "🎉",
        iconBg: "rgba(245, 158, 11, 0.12)",
        categoryTag: "Achievement",
      };
    case "lesson":
      return {
        tabCategory: "learning",
        icon: "📚",
        iconBg: "rgba(59, 130, 246, 0.12)",
        categoryTag: "Lesson",
      };
    case "quiz":
      return {
        tabCategory: "learning",
        icon: "🏆",
        iconBg: "rgba(16, 185, 129, 0.12)",
        categoryTag: "Quiz Result",
      };
    case "streak":
      return {
        tabCategory: "achievements",
        icon: "🔥",
        iconBg: "rgba(249, 115, 22, 0.12)",
        categoryTag: "Streak",
      };
    case "xp":
      return {
        tabCategory: "achievements",
        icon: "⭐",
        iconBg: "rgba(245, 158, 11, 0.12)",
        categoryTag: "Rewards",
      };
    case "announcement":
    default:
      return {
        tabCategory: "announcements",
        icon: "📢",
        iconBg: "rgba(124, 58, 237, 0.12)",
        categoryTag: "Announcement",
      };
  }
}

/**
 * Creates a notification record in the database for a student.
 */
export async function createStudentNotification(params: CreateNotificationParams) {
  try {
    const defaults = getDefaultMetadata(params.type);

    const record = await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        tabCategory: params.tabCategory ?? defaults.tabCategory,
        icon: params.icon ?? defaults.icon,
        iconBg: params.iconBg ?? defaults.iconBg,
        title: params.title,
        description: params.description,
        categoryTag: params.categoryTag ?? defaults.categoryTag,
        actionUrl: params.actionUrl,
        actionText: params.actionText,
        isRead: false,
      },
    });

    return record;
  } catch (error) {
    console.error("[createStudentNotification] Failed to create notification:", error);
    return null;
  }
}
