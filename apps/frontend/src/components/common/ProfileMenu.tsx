"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProfileMenuProps {
  avatarUrl?: string;
  studentName?: string;
}

export default function ProfileMenu({
  avatarUrl = "/assets/avatars/user-student-boy.png",
  studentName = "Student Profile",
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { logout } = useAuth();

  /* ─────────────────────────────────────────────
     Close dropdown when clicking outside
  ───────────────────────────────────────────── */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* ─────────────────────────────────────────────
     Logout — the shared AuthContext logout clears the session, tells other
     tabs, and leaves with a full page load. It only returns when it failed.
  ───────────────────────────────────────────── */

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    if (!(await logout())) {
      console.error("[ProfileMenu] Logout request failed");
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="profile-menu-container"
    >
      {/* ─────────────────────────────────────────
          Profile Trigger
      ───────────────────────────────────────── */}

      <button
        type="button"
        className="profile-menu-trigger"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${studentName} profile menu`}
      >
        <div className="profile-avatar-wrapper">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={studentName}
              className="profile-avatar-image"
            />
          ) : (
            <div
              className="avatar-placeholder"
              title={studentName}
            >
              👤
            </div>
          )}
        </div>

        <span className="profile-dropdown-arrow">
          {isOpen ? "▴" : "▾"}
        </span>
      </button>

      {/* ─────────────────────────────────────────
          Dropdown
      ───────────────────────────────────────── */}

      {isOpen && (
        <div
          className="profile-dropdown"
          role="menu"
        >
          {/* Student Info */}
          <div className="profile-dropdown-user">
            <div className="profile-dropdown-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={studentName}
                  className="profile-avatar-image"
                />
              ) : (
                <span>👤</span>
              )}
            </div>

            <div className="profile-dropdown-user-info">
              <span className="profile-dropdown-name">
                {studentName}
              </span>

              <span className="profile-dropdown-role">
                Student
              </span>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          {/* Profile */}
          <button
            type="button"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              router.push("/student/profile");
            }}
          >
            <span className="profile-dropdown-item-icon">
              👤
            </span>

            <span>My Profile</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            className="profile-dropdown-item logout-item"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <span className="profile-dropdown-item-icon">
              {isLoggingOut ? "⏳" : "🚪"}
            </span>

            <span>
              {isLoggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
