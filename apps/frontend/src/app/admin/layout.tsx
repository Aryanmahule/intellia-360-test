import SessionGuard from "@/components/auth/SessionGuard";

// Only ADMIN accounts reach this layout: RouteGuard (components/auth) sends
// signed-out visitors to /login and other roles to their own dashboard before
// anything under /admin renders, and the /api/admin/* routes check the session
// themselves.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: the dark-mode class is applied by AdminNavbar after hydration rather
  // than by a pre-paint inline script. Setting it on <html> before hydration
  // makes React report an attribute mismatch on the root element, and the fix
  // for that (suppressHydrationWarning) lives in the shared root layout,
  // outside this module.
  return <SessionGuard area="admin">{children}</SessionGuard>;
}
