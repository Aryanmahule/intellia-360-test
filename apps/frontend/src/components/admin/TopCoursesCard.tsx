"use client";

import React from "react";
import Link from "next/link";
import type { AdminTopCourse } from "@/data/admin/useAdminDashboard";
import { formatCount, formatGrade } from "@/data/admin/useAdminDashboard";
import { ArrowRight, BookOpen } from "@/components/admin/icons";

interface TopCoursesCardProps {
  courses: AdminTopCourse[];
}

export default function TopCoursesCard({ courses }: TopCoursesCardProps) {
  return (
    <section className="admin-card admin-courses-card">
      <header className="admin-card-header">
        <div>
          <h3 className="admin-card-title">Top Courses</h3>
          <p className="admin-card-subtitle">Ranked by enrolled students</p>
        </div>
        <Link href="/admin/courses" className="admin-link-action">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {courses.length === 0 ? (
        <div className="admin-empty-state">
          <BookOpen className="w-6 h-6" />
          <p className="admin-empty-title">No courses yet</p>
          <p className="admin-empty-text">
            Create your first course and it will be ranked here.
          </p>
        </div>
      ) : (
        <ul className="admin-course-list">
          {courses.map((course, index) => (
            <li key={course.id}>
              <Link href="/admin/courses" className="admin-course-row">
                <span className="admin-course-rank">{index + 1}</span>

                <span className="admin-course-body">
                  <span className="admin-course-title">{course.title}</span>
                  <span className="admin-course-meta">
                    {formatGrade(course.grade)} · {formatCount(course.students)} students ·{" "}
                    {formatCount(course.lessons)} lessons
                  </span>
                </span>

                <span className="admin-course-progress">
                  <span className="admin-progress-track">
                    <span
                      className="admin-progress-fill"
                      style={{ width: `${course.completionPercent}%` }}
                    />
                  </span>
                  <span className="admin-course-percent">{course.completionPercent}%</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
