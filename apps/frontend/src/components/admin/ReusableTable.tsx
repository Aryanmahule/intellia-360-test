"use client";

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, MoreVertical } from "@/components/admin/icons";

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  danger?: boolean;
}

interface ReusableTableProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  rowActions?: RowAction<T>[];
}

const ROWS_PER_PAGE = 10;

export default function ReusableTable<T extends { id: string }>({
  title,
  subtitle,
  data,
  columns,
  searchPlaceholder = "Search records...",
  primaryActionLabel,
  onPrimaryAction,
  rowActions,
}: ReusableTableProps<T>) {
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filteredData = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const pagedData = filteredData.slice(pageStart, pageStart + ROWS_PER_PAGE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="admin-card">
      {/* Table Header Controls */}
      <div className="admin-table-toolbar">
        <div className="admin-table-heading">
          <h3 className="admin-card-title">{title}</h3>
          {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
        </div>

        <div className="admin-table-controls">
          <div className="admin-table-search">
            <Search className="admin-table-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="table-search-input"
            />
          </div>

          {primaryActionLabel && (
            <button onClick={onPrimaryAction} className="admin-btn-primary">
              + {primaryActionLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table Element */}
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
              <th className="admin-table-actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="admin-table-empty">
                  No records match your search query.
                </td>
              </tr>
            ) : (
              pagedData.map((row) => (
                <tr key={row.id}>
                  {columns.map((col, idx) => (
                    <td key={idx}>
                      {col.cell
                        ? col.cell(row)
                        : typeof col.accessor === "function"
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  <td style={{ position: "relative" }}>
                    {rowActions && rowActions.length > 0 ? (
                      <>
                        <button
                          type="button"
                          className="admin-table-row-btn"
                          aria-label="Row actions"
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === row.id}
                          onClick={() => setOpenMenuId((prev) => (prev === row.id ? null : row.id))}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === row.id && (
                          <>
                            <div
                              style={{ position: "fixed", inset: 0, zIndex: 40 }}
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div
                              style={{
                                position: "absolute", right: 0, top: "100%", zIndex: 50,
                                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                                boxShadow: "0 10px 30px rgba(0,0,0,.12)", minWidth: 140, overflow: "hidden",
                              }}
                            >
                              {rowActions.map((action) => (
                                <button
                                  key={action.label}
                                  onClick={() => { setOpenMenuId(null); action.onClick(row); }}
                                  style={{
                                    display: "block", width: "100%", textAlign: "left",
                                    padding: "9px 14px", fontSize: 12.5, fontWeight: 600, background: "none", border: "none",
                                    color: action.danger ? "#dc2626" : "#334155", cursor: "pointer",
                                  }}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <button type="button" className="admin-table-row-btn" aria-label="No actions available" disabled>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Controls */}
      <div className="admin-table-pagination">
        <span>
          {filteredData.length === 0
            ? "No entries"
            : `Showing ${pageStart + 1} to ${Math.min(pageStart + ROWS_PER_PAGE, filteredData.length)} of ${filteredData.length} entries`}
        </span>
        <div className="admin-table-pager">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="admin-table-page-btn"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="admin-table-page-count">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="admin-table-page-btn"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
