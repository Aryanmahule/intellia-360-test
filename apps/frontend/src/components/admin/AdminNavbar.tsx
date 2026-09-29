"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminDestinations } from "@/data/admin/sidebar";
import {
  Search,
  Bell,
  Menu,
  Sun,
  Moon,
  CheckCircle2,
  ChevronDown,
  Inbox,
  User,
  LogOut,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

interface PendingAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  requestedRole: string;
}

interface AdminNavbarProps {
  onToggleSidebar: () => void;
}

/* ── Theme store ───────────────────────────────────────────────────────────
   localStorage is external state, so it is read through useSyncExternalStore
   rather than a useState initialiser. Seeding state from localStorage during
   render makes the server emit the light-mode markup while the client renders
   dark, which React reports as a hydration mismatch.
   ────────────────────────────────────────────────────────────────────────── */

const THEME_KEY = "adminTheme";
const themeListeners = new Set<() => void>();

function subscribeToTheme(onChange: () => void): () => void {
  themeListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    themeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getThemeSnapshot(): "dark" | "light" {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** The server has no browser storage to read, so it always renders light. */
function getServerThemeSnapshot(): "dark" | "light" {
  return "light";
}

function writeTheme(next: "dark" | "light") {
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage unavailable (private mode) — the theme just won't persist.
  }
  themeListeners.forEach((listener) => listener());
}

export default function AdminNavbar({ onToggleSidebar }: AdminNavbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("admin-dark", isDark);
  }, [isDark]);

  const toggleTheme = () => writeTheme(isDark ? "light" : "dark");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* ── Quick-nav search ───────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return adminDestinations.filter((d) => d.label.toLowerCase().includes(q));
  }, [searchQuery]);

  const goToSearchResult = (path: string) => {
    setSearchQuery("");
    setIsSearchOpen(false);
    router.push(path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      goToSearchResult(searchResults[0].path);
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  // Ctrl/Cmd + K focuses the search box, as the UI hint advertises.
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  /* ── Notifications: real pending role-upgrade requests ──────────────────── */
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    apiFetch("/api/admin/users?pending=true&limit=50", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        setPendingAccounts(
          (
            json.data as Array<{
              id: string;
              name: string;
              email: string;
              role: string;
              requestedRole: string | null;
            }>
          )
            .filter((u) => u.requestedRole)
            .map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              requestedRole: u.requestedRole as string,
            }))
        );
      })
      .catch(() => {
        // Aborted or network error — leave the bell showing the last known count
      });

    return () => controller.abort();
  }, []);

  const handleApprove = async (account: PendingAccount) => {
    setApprovingId(account.id);
    try {
      const res = await apiFetch(`/api/admin/users/${account.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: account.requestedRole }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingAccounts((prev) => prev.filter((a) => a.id !== account.id));
      } else {
        window.alert(json.message ?? "Failed to approve role upgrade.");
      }
    } catch {
      window.alert("Network error. Please try again.");
    } finally {
      setApprovingId(null);
    }
  };

  /* ── Close popovers on outside click ────────────────────────────────────── */
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setIsSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setIsNotifOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ── Logout ─────────────────────────────────────────────────────────────── */
  // The shared AuthContext logout clears the session, tells other tabs and
  // leaves with a full page load; it only returns when the request failed.
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    if (!(await logout())) {
      console.error("[AdminNavbar] Logout request failed");
      setIsLoggingOut(false);
      window.alert("Couldn't log out. Check your connection and try again.");
    }
  };

  const initials = (user?.name ?? "Admin")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <header className="admin-navbar">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="admin-nav-toggle"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div ref={searchRef} className="admin-search-wrapper">
        <Search className="admin-search-icon" />

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search anything…"
          className="admin-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Search admin pages"
        />

        {!searchQuery && <span className="admin-search-shortcut">Ctrl K</span>}

        {isSearchOpen && searchQuery && (
          <div className="admin-popover admin-search-results" role="listbox">
            {searchResults.length === 0 ? (
              <p className="admin-popover-empty">No matching pages.</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.path}
                  type="button"
                  className="admin-search-result"
                  onClick={() => goToSearchResult(result.path)}
                >
                  <Search className="w-3.5 h-3.5" />
                  {result.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="admin-nav-actions">
        <button
          onClick={toggleTheme}
          className="admin-icon-btn"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div ref={notifRef} className="admin-nav-popover-anchor">
          <button
            type="button"
            className="admin-icon-btn"
            title="Pending role upgrade requests"
            aria-label="Pending role requests"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            aria-expanded={isNotifOpen}
            aria-haspopup="menu"
          >
            <Bell className="w-5 h-5" />
            {pendingAccounts.length > 0 && (
              <span className="admin-badge-count">{pendingAccounts.length}</span>
            )}
          </button>

          {isNotifOpen && (
            <div className="admin-popover admin-notif-popover" role="menu">
              <div className="admin-popover-header">
                <span>Pending role requests</span>
                {pendingAccounts.length > 0 && (
                  <span className="admin-popover-count">{pendingAccounts.length}</span>
                )}
              </div>

              <div className="admin-popover-body">
                {pendingAccounts.length === 0 ? (
                  <div className="admin-popover-empty-state">
                    <Inbox className="w-6 h-6" />
                    <p>No pending requests right now.</p>
                  </div>
                ) : (
                  pendingAccounts.map((account) => (
                    <div key={account.id} className="admin-notif-row">
                      <div className="admin-notif-info">
                        <span className="admin-notif-name">{account.name}</span>
                        <span className="admin-notif-meta">
                          {account.role} → {account.requestedRole}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApprove(account)}
                        disabled={approvingId === account.id}
                        className="admin-notif-approve"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {approvingId === account.id ? "Approving…" : "Approve"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile ────────────────────────────────────────────────────── */}
        <div ref={profileRef} className="admin-nav-popover-anchor">
          <button
            type="button"
            className="admin-user-profile"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
          >
            <span className="admin-avatar">{initials || "A"}</span>

            <span className="admin-user-info">
              <span className="admin-user-name">{user?.name ?? "Admin"}</span>
              <span className="admin-user-role">Platform Administrator</span>
            </span>

            <ChevronDown className={`admin-profile-arrow${isProfileOpen ? " is-open" : ""}`} />
          </button>

          {isProfileOpen && (
            <div className="admin-popover admin-profile-dropdown" role="menu">
              <div className="admin-profile-dropdown-header">
                <span className="admin-avatar lg">{initials || "A"}</span>
                <div className="admin-profile-dropdown-info">
                  <span className="admin-profile-dropdown-name">{user?.name ?? "Admin"}</span>
                  <span className="admin-profile-dropdown-role">
                    {user?.email ?? "Platform Administrator"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="admin-profile-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push("/admin/profile");
                }}
              >
                <User className="w-4 h-4" />
                My Profile
              </button>

              <button
                type="button"
                className="admin-profile-dropdown-item is-danger"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
