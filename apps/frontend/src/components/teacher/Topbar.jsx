"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu, Bell, Star, Gem, ChevronDown, Copy, Check,
  Sparkles, MessageSquare, Settings, TrendingUp, LogOut, User,
  Trash2, BellOff, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/TeacherDataContext";

export default function Topbar({ title, subtitle, onMenu }) {
  const {
    teacher,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    notify
  } = useData();

  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyCode = () => {
    navigator.clipboard?.writeText(teacher.classCode).catch(() => {});
    setCopied(true);
    notify("Class code copied to clipboard!");
    setTimeout(() => setCopied(false), 1500);
  };

  // The menu stays open while the request runs so the "Logging out…" state is
  // visible; logout() leaves the page on success and only returns on failure.
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const ok = await logout();
    if (!ok) {
      setLoggingOut(false);
      notify("Couldn't log out — check your connection and try again.", "warn");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "quiz": return Sparkles;
      case "message": return MessageSquare;
      case "system": return Settings;
      case "report": return TrendingUp;
      default: return Bell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "quiz": return "bg-violet-tint text-violet";
      case "message": return "bg-jade-tint text-jade";
      case "system": return "bg-sky-tint text-sky";
      case "report": return "bg-amber-tint text-amber";
      default: return "bg-canvas text-ink/60";
    }
  };

  const handleNotificationClick = (n) => {
    markNotificationRead(n.id);
    setShowNotifications(false);
    if (n.route) {
      router.push(n.route);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-black/[0.06]">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button onClick={onMenu} aria-label="Open navigation" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-black/5 cursor-pointer">
          <Menu size={20} />
        </button>

        {pathname !== "/teacher/dashboard" && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.06] bg-white text-ink/75 hover:text-ink hover:bg-canvas text-[12.5px] font-semibold shadow-sm transition-all duration-200 cursor-pointer shrink-0"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        )}

        <div className="min-w-0 mr-auto">
          <h1 className="font-display font-semibold text-[19px] sm:text-[21px] leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[12.5px] text-ink/50 truncate">{subtitle}</p>}
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-white border border-black/[0.07] rounded-xl px-3 py-1.5 text-[12px] shadow-sm">
          <span className="text-ink/40">Class Code</span>
          <span className="font-mono font-semibold tracking-wide">{teacher.classCode}</span>
          <button onClick={copyCode} aria-label="Copy class code" className="ml-1 text-violet hover:text-violet-deep cursor-pointer">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 bg-amber-tint border border-amber/25 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-sm">
          <Star size={14} className="text-amber fill-amber" />
          {teacher.xp.toLocaleString()}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-sky-tint border border-sky/25 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-sm">
          <Gem size={14} className="text-sky" />
          {teacher.gems}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            aria-label={teacher.notifications > 0 ? `Notifications (${teacher.notifications} unread)` : "Notifications"}
            aria-haspopup="menu"
            aria-expanded={showNotifications}
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              showNotifications ? "bg-black/5 text-ink" : "hover:bg-black/5 text-ink/70"
            }`}
          >
            <Bell size={19} />
            {teacher.notifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-coral text-white text-[9px] font-bold grid place-items-center">
                {teacher.notifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-paper border border-black/[0.08] rounded-2xl shadow-xl z-50 overflow-hidden text-ink transition-all duration-200">
              <div className="p-3.5 border-b border-black/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[14px]">Notifications</span>
                  {teacher.notifications > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-coral-tint text-coral text-[10px] font-bold">
                      {teacher.notifications} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          markAllNotificationsRead();
                          notify("All notifications marked as read");
                        }}
                        className="text-[11px] text-violet hover:text-violet-deep font-semibold cursor-pointer transition-colors"
                      >
                        Mark all read
                      </button>
                      <span className="text-black/10">|</span>
                      <button
                        onClick={() => {
                          clearNotifications();
                          notify("Notifications cleared", "info");
                        }}
                        className="text-[11px] text-ink/40 hover:text-ink/60 cursor-pointer transition-colors"
                        title="Clear all"
                        aria-label="Clear all notifications"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.04] scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-ink/30 mb-2">
                      <BellOff size={18} />
                    </div>
                    <p className="text-[12.5px] font-semibold text-ink/70">All caught up!</p>
                    <p className="text-[11px] text-ink/40 mt-0.5">No new notifications here.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = getNotificationIcon(n.type);
                    const colorClass = getNotificationColor(n.type);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-3.5 flex gap-3 hover:bg-canvas transition-colors relative cursor-pointer ${
                          !n.read ? "bg-violet-tint/20" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${colorClass}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-[12px] truncate ${!n.read ? "font-semibold text-ink" : "font-medium text-ink/80"}`}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-ink/40 shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11.5px] text-ink/50 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.description}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={showProfile}
            className={`flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl transition-colors cursor-pointer ${
              showProfile ? "bg-black/5" : "hover:bg-black/5"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-violet text-white grid place-items-center text-[12px] font-bold shrink-0">
              {teacher.initials}
            </div>
            <ChevronDown size={14} className={`text-ink/40 hidden sm:block transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`} />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-paper border border-black/[0.08] rounded-2xl shadow-xl z-50 overflow-hidden text-ink transition-all duration-200">
              <div className="p-4 border-b border-black/[0.05] bg-canvas/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet text-white grid place-items-center text-[14px] font-bold shrink-0">
                    {teacher.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13.5px] truncate">{teacher.name}</p>
                    <p className="text-[11px] text-ink/40 truncate">{teacher.role}</p>
                    <p className="text-[10px] text-ink/50 truncate mt-0.5">{teacher.school}</p>
                  </div>
                </div>
              </div>

              <div className="p-1.5 divide-y divide-black/[0.04]">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push("/teacher/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-lg hover:bg-canvas text-ink/80 hover:text-ink cursor-pointer transition-colors"
                  >
                    <User size={14} className="text-ink/40" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push("/teacher/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-lg hover:bg-canvas text-ink/80 hover:text-ink cursor-pointer transition-colors"
                  >
                    <Settings size={14} className="text-ink/40" />
                    Settings
                  </button>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-ink/40 uppercase tracking-wider">
                    Class Options
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11.5px] font-medium text-ink/75">
                    <span className="text-ink/40 text-[11px]">Class Code</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold tracking-wider text-[11px]">{teacher.classCode}</span>
                      <button
                        onClick={copyCode}
                        aria-label="Copy class code"
                        className="text-violet hover:text-violet-deep p-0.5 rounded hover:bg-black/5 cursor-pointer"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    aria-busy={loggingOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold rounded-lg hover:bg-coral-tint text-coral cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    <LogOut size={14} />
                    {loggingOut ? "Logging out…" : "Log Out"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
