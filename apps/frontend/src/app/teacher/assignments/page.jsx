"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Calendar, Users2, Trash2, RefreshCw } from "lucide-react";
import { useData } from "@/context/TeacherDataContext";
import { Card, Button, Select, Pill } from "@/components/teacher/ui";
import CreateAssignmentModal from "@/components/teacher/modals/CreateAssignmentModal";
import {
  fetchAssignments,
  fetchClasses,
  updateAssignment,
  deleteAssignment,
  formatDue,
} from "@/data/teacher/assignments";

const COLUMNS = ["Not Started", "In Progress", "Completed", "Overdue"];

export default function Assignments() {
  const { notify } = useData();

  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [reloadToken, setReloadToken] = useState(0);

  // The board is the write surface for the student console, so it always
  // re-reads from the server after a change rather than patching local state.
  //
  // The fetch sits in an async IIFE and the loading flag is raised by whatever
  // triggered the reload, so no state is set synchronously inside the effect —
  // the same shape useAdminDashboard uses.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [rows, cls] = await Promise.all([fetchAssignments(), fetchClasses()]);
      if (cancelled) return;
      setAssignments(rows);
      setClasses(cls);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const load = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete the assignment "${title}"? Students will no longer see it.`)) return;
    setBusyId(id);
    const result = await deleteAssignment(id);
    setBusyId(null);
    notify(result.message, result.success ? "success" : "error");
    if (result.success) load();
  };

  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    const result = await updateAssignment(id, { status });
    setBusyId(null);
    if (!result.success) {
      notify(result.message, "error");
      return;
    }
    load();
  };

  const filtered = useMemo(
    () => assignments.filter((a) => classFilter === "all" || a.classId === classFilter),
    [assignments, classFilter]
  );

  const hasClasses = classes.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-auto min-w-[180px]"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh assignments"
            className="p-2 rounded-lg border border-black/[0.08] bg-white text-ink/60 hover:text-ink hover:bg-canvas transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!hasClasses}>
          <Plus size={15} /> New assignment
        </Button>
      </div>

      {!loading && !hasClasses && (
        <Card className="p-5">
          <p className="text-[13.5px] font-semibold text-ink">No classes yet</p>
          <p className="text-[12.5px] text-ink/55 mt-1">
            Assignments are given to a class, so you&apos;ll need a class before you can
            create one. Once a class exists here, anything you assign shows up in those
            students&apos; Assignments page straight away.
          </p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((status) => {
          const items = filtered.filter((a) => a.status === status);
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ink/50">{status}</p>
                <span className="text-[11px] font-mono font-semibold bg-black/[0.06] rounded-full px-1.5 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2.5 min-h-[60px]">
                {items.map((a) => (
                  <Card key={a.id} className={`p-3.5${busyId === a.id ? " opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-tight">{a.title}</p>
                      <Pill tone="ink" className="shrink-0">{a.type}</Pill>
                    </div>
                    {a.description && (
                      <p className="text-[11.5px] text-ink/50 mt-1 line-clamp-2">{a.description}</p>
                    )}
                    <p className="text-[11px] text-ink/40 mt-1.5 flex items-center gap-1">
                      <Users2 size={11} /> {a.className}
                    </p>
                    <p className="text-[11px] text-ink/40 flex items-center gap-1 mt-0.5">
                      <Calendar size={11} /> {formatDue(a.dueDate)}
                    </p>

                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10.5px] text-ink/40 mb-1">
                        <span>Submitted</span>
                        <span className="font-mono">{a.submitted}/{a.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-jade rounded-full"
                          style={{ width: `${a.total ? (a.submitted / a.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={a.status}
                        disabled={busyId === a.id}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="w-full text-[11.5px] font-medium border border-black/10 rounded-lg px-2 py-1.5 bg-canvas outline-none focus:border-violet disabled:opacity-50"
                      >
                        {COLUMNS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => handleDelete(a.id, a.title)}
                        disabled={busyId === a.id}
                        className="p-1.5 rounded-lg border border-black/10 text-coral hover:bg-coral-tint hover:border-coral/25 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title="Delete assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-[12px] text-ink/30 border border-dashed border-black/10 rounded-xl py-6 text-center">
                    {loading ? "Loading…" : "Nothing here"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateAssignmentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        classes={classes}
        onCreated={load}
      />
    </div>
  );
}
