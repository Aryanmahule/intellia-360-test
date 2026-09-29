"use client";

import React, { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportCard from "@/components/admin/ReportCard";
import { adminReportCards } from "@/data/admin/reports";
import {
  FileText,
  Download,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  /* =========================================
     Dynamic Report Statistics
     Based only on existing adminReportCards
  ========================================= */

  const reportStats = useMemo(() => {
    const totalReports = adminReportCards.length;

    return {
      totalReports,
      availableReports: totalReports,
    };
  }, []);

  /* =========================================
     Download Action
  ========================================= */

  const downloadCsv = async (type: string, filename: string) => {
    const res = await apiFetch(`/api/admin/reports/export?type=${type}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (reportId: string) => {
    setSelectedReport(reportId);
    downloadCsv(reportId, `${reportId}.csv`);
  };

  return (
    <AdminLayout>
      <div className="admin-reports-page">

        {/* =====================================
            Header
        ===================================== */}

        <div className="admin-reports-header">
          <div>
            <div className="admin-breadcrumb">
              Admin / Reports
            </div>

            <h1 className="admin-page-title">
              Platform Compliance & Data Reports
            </h1>

            <p className="admin-page-subtitle">
              Download daily active user logs, school performance
              summaries, revenue statements, and security audits.
            </p>
          </div>

          <button
            type="button"
            className="admin-primary-button"
            onClick={() => downloadCsv("all", "admin-reports-all.csv")}
          >
            <Download className="h-4 w-4" />
            Export All Reports
          </button>
        </div>

        {/* =====================================
            Dynamic Statistics
        ===================================== */}

        <div className="report-stats-grid">

          {/* Total Reports */}
          <div className="report-stat-card">
            <div className="report-stat-icon orange">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <span>Total Reports</span>

              <strong>
                {reportStats.totalReports}
              </strong>

              <small>
                Reports in the library
              </small>
            </div>
          </div>

          {/* Available Reports */}
          <div className="report-stat-card">
            <div className="report-stat-icon green">
              <Download className="h-6 w-6" />
            </div>

            <div>
              <span>Available Reports</span>

              <strong>
                {reportStats.availableReports}
              </strong>

              <small>
                Ready to view or download
              </small>
            </div>
          </div>

          {/* Report Library */}
          <div className="report-stat-card">
            <div className="report-stat-icon slate">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <span>Report Library</span>

              <strong>
                {reportStats.totalReports}
              </strong>

              <small>
                Managed report templates
              </small>
            </div>
          </div>
        </div>

        {/* =====================================
            Reports
        ===================================== */}

        {adminReportCards.length > 0 ? (
          <div className="report-card-grid">
            {adminReportCards.map((report) => (
              <div
                key={report.id}
                className={`admin-report-wrapper ${selectedReport === report.id
                  ? "report-selected"
                  : ""
                  }`}
              >
                <ReportCard report={report} />

                <button
                  type="button"
                  className="report-download-button"
                  onClick={() => handleDownload(report.id)}
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="reports-empty-state">
            <div className="reports-empty-icon">
              <FileText className="h-7 w-7" />
            </div>

            <h2>No reports available</h2>

            <p>
              Reports will appear here when they are
              added to the report library.
            </p>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}