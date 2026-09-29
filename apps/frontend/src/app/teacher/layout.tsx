import React from "react";
import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { TeacherDataProvider } from "@/context/TeacherDataContext";
import TeacherShell from "@/components/teacher/TeacherShell";
import SessionGuard from "@/components/auth/SessionGuard";

// Display + data faces for the Teacher Console. Inter (the UI face) is already
// loaded by the root layout; these two are only pulled in for /teacher/*.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teacher Console · Intellia360",
  description:
    "Classes, gamified student progress, AI teaching assistant, and reports for Intellia360 teachers.",
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} ${jetbrainsMono.variable} teacher-shell`}>
      <SessionGuard area="teacher">
        <TeacherDataProvider>
          <TeacherShell>{children}</TeacherShell>
        </TeacherDataProvider>
      </SessionGuard>
    </div>
  );
}
