"use client";

import { AuthProvider } from "@/context/AuthContext";
import RouteGuard from "@/components/auth/RouteGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RouteGuard>{children}</RouteGuard>
    </AuthProvider>
  );
}
