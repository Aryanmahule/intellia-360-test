export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: {
    text: string;
    color: string;
  };
  children?: { label: string; path: string }[];
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

/**
 * Admin navigation.
 *
 * Every entry points at a route that exists under `src/app/admin` — the module
 * has no placeholder destinations.
 */
export const sidebarSections: MenuSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "LayoutDashboard",
        path: "/admin/dashboard",
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: "TrendingUp",
        path: "/admin/analytics",
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "users",
        label: "Users",
        icon: "Users",
        path: "/admin/users",
        children: [
          { label: "All Users & Roles", path: "/admin/users" },
          { label: "Students", path: "/admin/students" },
          { label: "Teachers", path: "/admin/teachers" },
        ],
      },
      {
        id: "schools",
        label: "Schools",
        icon: "Building2",
        path: "/admin/schools",
      },
    ],
  },
  {
    id: "learning",
    label: "Learning",
    items: [
      {
        id: "courses",
        label: "Courses",
        icon: "BookOpen",
        path: "/admin/courses",
      },
      {
        id: "content",
        label: "Content Library",
        icon: "FolderKanban",
        path: "/admin/content",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "payments",
        label: "Payments",
        icon: "CreditCard",
        path: "/admin/payments",
      },
      {
        id: "reports",
        label: "Reports",
        icon: "FileText",
        path: "/admin/reports",
      },
      {
        id: "settings",
        label: "System Settings",
        icon: "Settings",
        path: "/admin/settings",
      },
    ],
  },
];

/** Flat list — kept for the navbar quick-search and any existing consumers. */
export const sidebarMenuItems: MenuItem[] = sidebarSections.flatMap((section) => section.items);

/** Every reachable admin destination, including nested children. */
export const adminDestinations: { label: string; path: string }[] = [
  ...sidebarSections.flatMap((section) =>
    section.items.flatMap((item) =>
      item.children && item.children.length > 0
        ? item.children.map((child) => ({ label: child.label, path: child.path }))
        : [{ label: item.label, path: item.path }]
    )
  ),
  { label: "My Profile", path: "/admin/profile" },
];
