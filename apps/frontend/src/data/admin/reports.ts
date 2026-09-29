export interface ReportConfig {
  id: string;
  title: string;
  category: "Daily" | "Weekly" | "Monthly" | "Annual";
  description: string;
  lastGenerated: string;
  fileSize: string;
  downloads: number;
}

export const adminReportCards: ReportConfig[] = [
  {
    id: "rep_1",
    title: "Daily Active Users & Engagement",
    category: "Daily",
    description: "Detailed metrics on daily logins, active learning hours, and AI tutor usage.",
    lastGenerated: "Today at 06:00 AM",
    fileSize: "1.2 MB",
    downloads: 42,
  },
  {
    id: "rep_2",
    title: "Weekly School Performance Summary",
    category: "Weekly",
    description: "Completion rates across registered schools, quiz scores, and teacher activity.",
    lastGenerated: "Yesterday",
    fileSize: "3.4 MB",
    downloads: 128,
  },
  {
    id: "rep_3",
    title: "Monthly Financial & Subscription Revenue",
    category: "Monthly",
    description: "Revenue breakdown by subscription tier, renewal rates, and payment gateway logs.",
    lastGenerated: "Aug 1, 2026",
    fileSize: "5.8 MB",
    downloads: 85,
  },
  {
    id: "rep_4",
    title: "Platform Infrastructure & Security Audit",
    category: "Annual",
    description: "System uptime analysis, server health, API latency metrics, and security checks.",
    lastGenerated: "Jul 15, 2026",
    fileSize: "12.1 MB",
    downloads: 19,
  },
];
