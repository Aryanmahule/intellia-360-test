"use client";

import React, { Suspense } from "react";
import Header from "@/components/common/Header";
import Sidebar from "@/components/student/Sidebar";
import StickyBottomContainer from "@/components/student/StickyBottomContainer";
import SessionGuard from "@/components/auth/SessionGuard";
import { StudentProvider } from "@/context/StudentContext";
import "@/styles/layout.css";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentProvider>
      <SessionGuard area="student">
        <div className="student-shell">
          <Header />
          <div className="student-body">
            <Sidebar />
            <main className="student-main-content">
              {children}
            </main>
          </div>
          <Suspense fallback={null}>
            <StickyBottomContainer />
          </Suspense>
        </div>
      </SessionGuard>
    </StudentProvider>
  );
}
