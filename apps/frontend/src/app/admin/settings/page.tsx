"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Settings,
  Shield,
  Palette,
  Sparkles,
  Mail,
  Save,
} from "@/components/admin/icons";
import { apiFetch } from "@/lib/api";

type SettingsTab =
  | "general"
  | "branding"
  | "email"
  | "security"
  | "ai";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>("general");

  const [saved, setSaved] = useState(false);

  /* =========================
     GENERAL SETTINGS
  ========================= */

  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  /* =========================
     BRANDING SETTINGS
  ========================= */

  const [primaryColor, setPrimaryColor] =
    useState("#f97316");

  const [logoDisplay, setLogoDisplay] =
    useState("badge-text");

  /* =========================
     EMAIL SETTINGS
  ========================= */

  const [emailSettings, setEmailSettings] = useState({
    schoolRegistration: false,
    weeklySummary: false,
    renewalAlert: false,
  });

  /* =========================
     SECURITY SETTINGS
  ========================= */

  const [twoFactor, setTwoFactor] =
    useState("mandatory");

  const [sessionTimeout, setSessionTimeout] =
    useState("30");

  /* =========================
     AI SETTINGS
  ========================= */

  const [aiModel, setAiModel] =
    useState("fast");

  const [dailyQueries, setDailyQueries] =
    useState("");

  /* =========================
     TABS
  ========================= */

  const tabs = [
    {
      id: "general" as SettingsTab,
      label: "General",
      icon: <Settings className="w-4 h-4" />,
      description: "Platform information",
    },
    {
      id: "branding" as SettingsTab,
      label: "Branding",
      icon: <Palette className="w-4 h-4" />,
      description: "Visual identity",
    },
    {
      id: "email" as SettingsTab,
      label: "Notifications",
      icon: <Mail className="w-4 h-4" />,
      description: "Email preferences",
    },
    {
      id: "security" as SettingsTab,
      label: "Security",
      icon: <Shield className="w-4 h-4" />,
      description: "Access & security",
    },
    {
      id: "ai" as SettingsTab,
      label: "AI Tutor",
      icon: <Sparkles className="w-4 h-4" />,
      description: "AI configuration",
    },
  ];

  /* =========================
     LOAD SETTINGS
  ========================= */

  useEffect(() => {
    apiFetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const s = json.data;
        setPlatformName(s.platformName);
        setSupportEmail(s.supportEmail);
        setAcademicYear(s.academicYear);
        setPrimaryColor(s.primaryColor);
        setLogoDisplay(s.logoDisplay);
        setEmailSettings({
          schoolRegistration: s.emailSchoolRegistration,
          weeklySummary: s.emailWeeklySummary,
          renewalAlert: s.emailRenewalAlert,
        });
        setTwoFactor(s.twoFactor);
        setSessionTimeout(String(s.sessionTimeoutMinutes));
        setAiModel(s.aiModel);
        setDailyQueries(String(s.dailyQueries));
      })
      .catch(() => {});
  }, []);

  /* =========================
     SAVE SETTINGS
  ========================= */

  const handleSave = async () => {
    const settings = {
      platformName,
      supportEmail,
      academicYear,
      primaryColor,
      logoDisplay,
      emailSchoolRegistration: emailSettings.schoolRegistration,
      emailWeeklySummary: emailSettings.weeklySummary,
      emailRenewalAlert: emailSettings.renewalAlert,
      twoFactor,
      sessionTimeoutMinutes: Number(sessionTimeout) || 30,
      aiModel,
      dailyQueries: Number(dailyQueries) || 0,
    };

    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!json.success) return;

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <AdminLayout>
      <div className="settings-page">

        {/* =========================
            HEADER
        ========================= */}

        <div className="settings-header">
          <div>
            <div className="settings-title-row">
              <div className="settings-title-icon">
                <Settings className="w-5 h-5" />
              </div>

              <span className="settings-eyebrow">
                PLATFORM CONFIGURATION
              </span>
            </div>

            <h1>
              Platform Settings
            </h1>

            <p>
              Configure Intellia360 platform preferences,
              branding, notifications, security and AI behavior.
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`settings-save-btn ${saved ? "saved" : ""
              }`}
          >
            <Save className="w-4 h-4" />

            {saved
              ? "Changes Saved!"
              : "Save Settings"}
          </button>
        </div>

        {/* =========================
            SETTINGS LAYOUT
        ========================= */}

        <div className="settings-layout">

          {/* SIDEBAR TABS */}

          <aside className="settings-tabs">

            <div className="settings-tabs-heading">
              Configuration
            </div>

            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-tab ${activeTab === tab.id
                    ? "active"
                    : ""
                  }`}
              >
                <span className="settings-tab-icon">
                  {tab.icon}
                </span>

                <span className="settings-tab-content">
                  <strong>{tab.label}</strong>
                  <small>{tab.description}</small>
                </span>

                {activeTab === tab.id && (
                  <span className="settings-tab-arrow">
                    →
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* CONTENT */}

          <main className="settings-content">

            {/* =========================
                GENERAL
            ========================= */}

            {activeTab === "general" && (
              <section className="settings-section">

                <SettingsSectionHeader
                  icon={<Settings className="w-5 h-5" />}
                  title="General Platform Information"
                  description="Basic information used across the Intellia360 platform."
                />

                <div className="settings-form-grid">

                  <SettingsInput
                    label="Platform Name"
                    value={platformName}
                    onChange={setPlatformName}
                    placeholder="Enter platform name"
                  />

                  <SettingsInput
                    label="Support Email"
                    type="email"
                    value={supportEmail}
                    onChange={setSupportEmail}
                    placeholder="support@example.com"
                  />

                  <SettingsInput
                    label="Academic Year"
                    value={academicYear}
                    onChange={setAcademicYear}
                    placeholder="e.g. 2026 - 2027"
                  />

                </div>

              </section>
            )}

            {/* =========================
                BRANDING
            ========================= */}

            {activeTab === "branding" && (
              <section className="settings-section">

                <SettingsSectionHeader
                  icon={<Palette className="w-5 h-5" />}
                  title="Branding & Visual Identity"
                  description="Customize the appearance of your Intellia360 platform."
                />

                <div className="settings-form-grid">

                  <div className="settings-field">
                    <label>
                      Primary Accent Color
                    </label>

                    <div className="color-picker-box">

                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) =>
                          setPrimaryColor(e.target.value)
                        }
                      />

                      <div>
                        <strong>
                          Intellia Orange
                        </strong>

                        <span>
                          {primaryColor}
                        </span>
                      </div>

                    </div>
                  </div>

                  <div className="settings-field">
                    <label>
                      Logo Display
                    </label>

                    <select
                      value={logoDisplay}
                      onChange={(e) =>
                        setLogoDisplay(e.target.value)
                      }
                    >
                      <option value="badge-text">
                        Intellia360 Badge + Text
                      </option>

                      <option value="icon">
                        Icon Only
                      </option>

                      <option value="text">
                        Text Only
                      </option>
                    </select>
                  </div>

                </div>

                <div className="branding-preview">
                  <span>Live Preview</span>

                  <div
                    className="brand-preview-box"
                    style={{
                      borderColor: primaryColor,
                    }}
                  >
                    <div
                      className="brand-preview-logo"
                      style={{
                        backgroundColor: primaryColor,
                      }}
                    >
                      360
                    </div>

                    <strong>
                      intellia<span>360</span>
                    </strong>
                  </div>
                </div>

              </section>
            )}

            {/* =========================
                EMAIL
            ========================= */}

            {activeTab === "email" && (
              <section className="settings-section">

                <SettingsSectionHeader
                  icon={<Mail className="w-5 h-5" />}
                  title="Email Notifications"
                  description="Choose which platform events should generate email alerts."
                />

                <div className="settings-options">

                  <ToggleOption
                    title="New school registration"
                    description="Notify administrators when a new school registers."
                    checked={
                      emailSettings.schoolRegistration
                    }
                    onChange={(checked) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        schoolRegistration: checked,
                      }))
                    }
                  />

                  <ToggleOption
                    title="Weekly platform summary"
                    description="Send weekly activity and performance summaries."
                    checked={
                      emailSettings.weeklySummary
                    }
                    onChange={(checked) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        weeklySummary: checked,
                      }))
                    }
                  />

                  <ToggleOption
                    title="Subscription renewal alert"
                    description="Notify administrators before subscription expiry."
                    checked={
                      emailSettings.renewalAlert
                    }
                    onChange={(checked) =>
                      setEmailSettings((prev) => ({
                        ...prev,
                        renewalAlert: checked,
                      }))
                    }
                  />

                </div>

              </section>
            )}

            {/* =========================
                SECURITY
            ========================= */}

            {activeTab === "security" && (
              <section className="settings-section">

                <SettingsSectionHeader
                  icon={<Shield className="w-5 h-5" />}
                  title="Security & Access"
                  description="Configure administrator authentication and session policies."
                />

                <div className="settings-form-grid">

                  <div className="settings-field">
                    <label>
                      Two-Factor Authentication
                    </label>

                    <select
                      value={twoFactor}
                      onChange={(e) =>
                        setTwoFactor(e.target.value)
                      }
                    >
                      <option value="mandatory">
                        Mandatory for all administrators
                      </option>

                      <option value="optional">
                        Optional
                      </option>

                      <option value="disabled">
                        Disabled
                      </option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>
                      Session Inactivity Timeout
                    </label>

                    <select
                      value={sessionTimeout}
                      onChange={(e) =>
                        setSessionTimeout(e.target.value)
                      }
                    >
                      <option value="30">
                        30 minutes
                      </option>

                      <option value="60">
                        1 hour
                      </option>

                      <option value="240">
                        4 hours
                      </option>

                      <option value="480">
                        8 hours
                      </option>
                    </select>
                  </div>

                </div>

                <div className="security-notice">
                  <Shield className="w-5 h-5" />

                  <div>
                    <strong>
                      Security recommendation
                    </strong>

                    <p>
                      Keep two-factor authentication enabled
                      for administrator accounts.
                    </p>
                  </div>
                </div>

              </section>
            )}

            {/* =========================
                AI
            ========================= */}

            {activeTab === "ai" && (
              <section className="settings-section">

                <SettingsSectionHeader
                  icon={<Sparkles className="w-5 h-5" />}
                  title="AI Tutor Configuration"
                  description="Configure AI Tutor behavior and usage limits for students."
                />

                <div className="settings-form-grid">

                  <div className="settings-field">
                    <label>
                      Default AI Model
                    </label>

                    <select
                      value={aiModel}
                      onChange={(e) =>
                        setAiModel(e.target.value)
                      }
                    >
                      <option value="fast">
                        Intellia AI Tutor — Fast
                      </option>

                      <option value="advanced">
                        Intellia Math Solver — Advanced
                      </option>
                    </select>
                  </div>

                  <SettingsInput
                    label="Daily Queries Per Student"
                    type="number"
                    value={dailyQueries}
                    onChange={setDailyQueries}
                    placeholder="Enter query limit"
                  />

                </div>

                <div className="ai-preview">
                  <div className="ai-preview-icon">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  <div>
                    <strong>
                      AI Tutor Status
                    </strong>

                    <p>
                      Configuration will be applied when
                      connected to the backend AI service.
                    </p>
                  </div>

                  <span className="status-online">
                    Configurable
                  </span>
                </div>

              </section>
            )}

          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

/* =========================================
   REUSABLE INPUT
========================================= */

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="settings-field">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
      />
    </div>
  );
}

/* =========================================
   SECTION HEADER
========================================= */

function SettingsSectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-section-header">

      <div className="settings-section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

    </div>
  );
}

/* =========================================
   TOGGLE
========================================= */

function ToggleOption({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-option">

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? "active" : ""
          }`}
        aria-label={title}
      >
        <span />
      </button>

    </div>
  );
}