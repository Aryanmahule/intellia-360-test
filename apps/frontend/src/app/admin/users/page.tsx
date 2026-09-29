"use client";

import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { ALL_ROLES } from "@intellia360/shared/auth/roles";
import {
  changeUserRole,
  createUser,
  deleteUser,
  deleteUserPermanently,
  restoreUser,
} from "@/data/admin/tables";
import {
  Users,
  Clock,
  ShieldCheck,
  FileEdit,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

/** The subset of AdminUserRow (GET /api/admin/users) this page renders. */
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  requestedRole: string | null;
  emailVerified: boolean;
  createdAt: string;
  pendingUpgrade: boolean;
  deletedAt: string | null;
}

type Result = { success: boolean; message: string };

const PAGE_SIZE = 20;

const ROLE_INFO: Record<string, string> = {
  STUDENT: "Learner — lessons, quizzes and rewards.",
  PARENT:  "Follows a learner's progress.",
  TEACHER: "Teacher console — classes and assignments.",
  SCHOOL:  "School account with teacher console access.",
  EDITOR:  "Content console — grades, lessons and curriculum.",
  ADMIN:   "Full platform control, including every account and role.",
};

/** Reads `meta.total` for a filter. Resolves to null on failure. */
async function countUsers(params: string): Promise<number | null> {
  try {
    const res = await apiFetch(`/api/admin/users?limit=1&${params}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    return res.ok && json?.success ? Number(json.meta?.total ?? 0) : null;
  } catch {
    return null;
  }
}

function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/* ─── Change Role Modal ─────────────────────────────────────────────────────── */
function RoleModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: UserRow;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role === user.role) { onClose(); return; }
    if (
      role === "ADMIN" &&
      !window.confirm(`Grant ADMIN to ${user.name}? Admins have full control of the platform, including every account.`)
    ) return;

    setSaving(true); setError("");
    const result = await changeUserRole(user.id, role);
    setSaving(false);
    if (result.success) onSaved(result.message);
    else setError(result.message);
  }

  return (
    <div className="au-modal-overlay" onClick={onClose}>
      <form className="au-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="au-modal-header">
          <div>
            <div className="au-modal-title">Change role</div>
            <div className="au-modal-sub">{user.name} · {user.email}</div>
          </div>
          <button type="button" className="au-modal-close" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="au-modal-body">
          {user.pendingUpgrade && user.requestedRole && (
            <p className="au-hint">
              Requested at sign-up: <strong>{user.requestedRole}</strong>
            </p>
          )}

          <div className="au-role-options" role="radiogroup" aria-label="Role">
            {ALL_ROLES.map((r) => {
              // The API refuses an admin demoting themselves; don't offer it.
              const disabled = isSelf && r !== "ADMIN";
              return (
                <label
                  key={r}
                  className={`au-role-option${role === r ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    disabled={disabled}
                    onChange={() => setRole(r)}
                  />
                  <div>
                    <strong>
                      {r}
                      {r === user.role && <em className="au-current"> current</em>}
                    </strong>
                    <span>{ROLE_INFO[r]}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {isSelf && <p className="au-hint">You can&apos;t remove your own admin role — ask another admin.</p>}
          <p className="au-hint">The new role takes effect the next time they sign in.</p>
          {error && <p className="au-error">{error}</p>}
        </div>

        <div className="au-modal-footer">
          <button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-primary-button" disabled={saving || role === user.role}>
            {saving ? "Saving…" : "Save role"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── New User Modal ────────────────────────────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (message: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      form.role === "ADMIN" &&
      !window.confirm(`Create ${form.name || "this account"} as an ADMIN? Admins have full control of the platform.`)
    ) return;

    setSaving(true); setError("");
    const result = await createUser(form);
    setSaving(false);
    if (result.success) onCreated(result.message);
    else setError(result.message);
  }

  return (
    <div className="au-modal-overlay" onClick={onClose}>
      <form className="au-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="au-modal-header">
          <div>
            <div className="au-modal-title">New user</div>
            <div className="au-modal-sub">Create an account with its role already assigned.</div>
          </div>
          <button type="button" className="au-modal-close" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="au-modal-body">
          <label className="au-field">
            <span className="au-label">Full name</span>
            <input className="au-input" required minLength={2} placeholder="Jane Doe" value={form.name} onChange={set("name")} />
          </label>
          <label className="au-field">
            <span className="au-label">Email</span>
            <input className="au-input" type="email" required placeholder="jane@school.com" value={form.email} onChange={set("email")} />
          </label>
          <label className="au-field">
            <span className="au-label">Password</span>
            <input className="au-input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
            <span className="au-hint">At least 8 characters, with a letter, a number and a symbol.</span>
          </label>
          <label className="au-field">
            <span className="au-label">Role</span>
            <select className="au-input" value={form.role} onChange={set("role")}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="au-hint">{ROLE_INFO[form.role]}</span>
          </label>
          {error && <p className="au-error">{error}</p>}
        </div>

        <div className="au-modal-footer">
          <button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-primary-button" disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const { user: me } = useAuth();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const [counts, setCounts] = useState<{ total: number | null; pending: number | null; admins: number | null; editors: number | null } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Search is sent to the server, so wait for typing to pause.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (roleFilter) params.set("role", roleFilter);
    if (query) params.set("q", query);
    if (pendingOnly) params.set("pending", "true");
    if (showDeactivated) params.set("includeDeleted", "true");

    apiFetch(`/api/admin/users?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.message ?? `Could not load users (${res.status}).`);
        setRows(json.data as UserRow[]);
        setTotal(json.meta.total);
        setPages(json.meta.pages);
        setLoadError("");
        // The last row on the last page was just removed — step back a page.
        if (json.meta.page > json.meta.pages) setPage(json.meta.pages);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setLoadError(err instanceof Error ? err.message : "Could not load users.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, roleFilter, query, pendingOnly, showDeactivated, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      countUsers(""),
      countUsers("pending=true"),
      countUsers("role=ADMIN"),
      countUsers("role=EDITOR"),
    ]).then(([totalUsers, pending, admins, editors]) => {
      if (!cancelled) setCounts({ total: totalUsers, pending, admins, editors });
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  function applyFilter(next: { role?: string; pending?: boolean }) {
    setRoleFilter(next.role ?? "");
    setPendingOnly(next.pending ?? false);
    setPage(1);
    setLoading(true);
  }

  async function runAction(row: UserRow, action: () => Promise<Result>) {
    setBusyId(row.id);
    const result = await action();
    setBusyId(null);
    setNotice({ tone: result.success ? "ok" : "error", text: result.message });
    if (result.success) refresh();
  }

  function approve(row: UserRow) {
    if (!row.requestedRole) return;
    if (!window.confirm(`Approve ${row.name} as ${row.requestedRole}?`)) return;
    runAction(row, () => changeUserRole(row.id, row.requestedRole!));
  }

  function deactivate(row: UserRow) {
    if (!window.confirm(`Deactivate ${row.name}? Their history is kept and you can restore the account at any time.`)) return;
    runAction(row, () => deleteUser(row.id));
  }

  function eraseForever(row: UserRow) {
    if (!window.confirm(
      `Permanently delete ${row.name}? This erases all of their progress, quiz and badge history and cannot be undone.`
    )) return;
    runAction(row, () => deleteUserPermanently(row.id));
  }

  function handleSaved(message: string) {
    setEditing(null);
    setCreating(false);
    setNotice({ tone: "ok", text: message });
    refresh();
  }

  const show = (n: number | null | undefined) => (n === null || n === undefined ? "…" : n.toLocaleString());
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  const statCards = [
    { key: "all",     label: "Total users",   value: counts?.total,   hint: "Active accounts",       icon: Users,       tone: "purple", active: !pendingOnly && !roleFilter,     filter: {} },
    { key: "pending", label: "Role requests", value: counts?.pending, hint: "Awaiting your approval", icon: Clock,       tone: "orange", active: pendingOnly,                      filter: { pending: true } },
    { key: "admins",  label: "Admins",        value: counts?.admins,  hint: "Full platform access",  icon: ShieldCheck, tone: "green",  active: !pendingOnly && roleFilter === "ADMIN",  filter: { role: "ADMIN" } },
    { key: "editors", label: "Editors",       value: counts?.editors, hint: "Content console access", icon: FileEdit,    tone: "amber",  active: !pendingOnly && roleFilter === "EDITOR", filter: { role: "EDITOR" } },
  ];

  return (
    <AdminLayout>
      {editing && (
        <RoleModal
          user={editing}
          isSelf={editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {creating && <CreateUserModal onClose={() => setCreating(false)} onCreated={handleSaved} />}

      <div className="admin-users-page">
        <div className="admin-page-header">
          <div>
            <div className="admin-breadcrumb">Admin / Users</div>
            <h1 className="admin-page-title">Users &amp; Roles</h1>
            <p className="admin-page-subtitle">
              Every account on the platform — assign roles, approve role requests, and deactivate or restore accounts.
            </p>
          </div>
          <button className="admin-primary-button" onClick={() => setCreating(true)}>+ New User</button>
        </div>

        <div className="student-stats-grid">
          {statCards.map(({ key, label, value, hint, icon: Icon, tone, active, filter }) => (
            <button
              key={key}
              type="button"
              className={`student-stat-card au-stat${active ? " is-active" : ""}`}
              onClick={() => applyFilter(filter)}
              aria-pressed={active}
            >
              <div className={`student-stat-icon ${tone}`}><Icon className="h-6 w-6" /></div>
              <div className="student-stat-content">
                <span>{label}</span>
                <strong>{show(value)}</strong>
                <small>{hint}</small>
              </div>
            </button>
          ))}
        </div>

        {notice && (
          <div className={`au-notice ${notice.tone}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-table-toolbar">
            <div className="au-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!pendingOnly}
                className={`au-tab${!pendingOnly ? " active" : ""}`}
                onClick={() => applyFilter({ role: roleFilter })}
              >
                All users
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pendingOnly}
                className={`au-tab${pendingOnly ? " active" : ""}`}
                onClick={() => applyFilter({ role: roleFilter, pending: true })}
              >
                Role requests
                {!!counts?.pending && <span className="au-tab-count">{counts.pending}</span>}
              </button>
            </div>

            <div className="admin-table-controls">
              <div className="admin-table-search">
                <Search className="admin-table-search-icon" />
                <input
                  type="text"
                  className="table-search-input"
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="au-input au-select"
                value={roleFilter}
                onChange={(e) => applyFilter({ role: e.target.value, pending: pendingOnly })}
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <label className="au-toggle">
                <input
                  type="checkbox"
                  checked={showDeactivated}
                  onChange={(e) => { setShowDeactivated(e.target.checked); setPage(1); setLoading(true); }}
                />
                Show deactivated
              </label>
            </div>
          </div>

          {loadError && <div className="au-notice error">{loadError}</div>}

          <div className="table-responsive">
            <table className="admin-table au-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan={5} className="admin-table-empty">Loading users…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">
                      {pendingOnly ? "No role requests waiting for approval." : "No users match these filters."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelf = row.id === me?.id;
                    const busy = busyId === row.id;
                    const deactivated = row.deletedAt !== null;
                    return (
                      <tr key={row.id} className={deactivated ? "is-deactivated" : undefined}>
                        <td>
                          <div className="au-user">
                            <div className={`au-avatar au-tone-${row.role}`}>{initialOf(row.name)}</div>
                            <div className="au-user-text">
                              <div className="au-user-name">
                                {row.name}
                                {isSelf && <span className="au-you">You</span>}
                              </div>
                              <div className="au-user-email">{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`au-role-pill au-tone-${row.role}`}>{row.role}</span>
                          {row.pendingUpgrade && row.requestedRole && (
                            <span className="au-requested">Requested {row.requestedRole}</span>
                          )}
                        </td>
                        <td>
                          {deactivated ? (
                            <span className="au-status off">Deactivated</span>
                          ) : row.emailVerified ? (
                            <span className="au-status ok">Active</span>
                          ) : (
                            <span className="au-status warn">Unverified</span>
                          )}
                        </td>
                        <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="au-actions">
                            {deactivated ? (
                              <>
                                <button type="button" className="au-btn" disabled={busy}
                                  onClick={() => runAction(row, () => restoreUser(row.id))}>
                                  Restore
                                </button>
                                <button type="button" className="au-btn danger" disabled={busy} onClick={() => eraseForever(row)}>
                                  Delete forever
                                </button>
                              </>
                            ) : (
                              <>
                                {row.pendingUpgrade && row.requestedRole && (
                                  <button type="button" className="au-btn primary" disabled={busy} onClick={() => approve(row)}>
                                    Approve {row.requestedRole}
                                  </button>
                                )}
                                <button type="button" className="au-btn" disabled={busy} onClick={() => setEditing(row)}>
                                  Change role
                                </button>
                                <button
                                  type="button"
                                  className="au-btn danger"
                                  disabled={busy || isSelf}
                                  title={isSelf ? "You cannot deactivate your own account" : undefined}
                                  onClick={() => deactivate(row)}
                                >
                                  Deactivate
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-table-pagination">
            <span>{total === 0 ? "No entries" : `Showing ${firstShown} to ${lastShown} of ${total} users`}</span>
            <div className="admin-table-pager">
              <button
                type="button"
                className="admin-table-page-btn"
                disabled={page <= 1}
                onClick={() => { setPage((p) => p - 1); setLoading(true); }}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="admin-table-page-count">{page} / {pages}</span>
              <button
                type="button"
                className="admin-table-page-btn"
                disabled={page >= pages}
                onClick={() => { setPage((p) => p + 1); setLoading(true); }}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
