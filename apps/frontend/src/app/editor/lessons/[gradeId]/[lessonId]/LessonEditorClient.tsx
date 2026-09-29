"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LessonModuleConfig } from "@intellia360/shared/types/student";
import { apiFetch } from "@/lib/api";
import { useRouteParams } from "@/lib/route-params";
import {
  LESSON_MODULE_KEYS,
  LESSON_MODULE_LABELS,
  normalizeLessonModules,
  validateLessonModules,
  type LessonModuleErrors,
  type LessonModuleKey,
  type LessonModules,
} from "@intellia360/shared/content/lesson-modules";

interface LessonData {
  id:           string;
  title:        string;
  description:  string;
  chapterId:    string;
  chapterTitle: string;
  grade:        string;
  estimatedMinutes: number;
  completed:    boolean;
  locked:       boolean;
  heroVisualizer:     string;
  heroVisualizerData: Record<string, unknown>;
  modules:      LessonModules;
  previousLesson: { id: string; title: string } | null;
  nextLesson:     { id: string; title: string } | null;
}

/** Parses lesson JSON and fills in any missing modules; null when it is not an object. */
function toLesson(raw: unknown): LessonData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as LessonData;
  return { ...data, modules: normalizeLessonModules(data.modules) };
}

export default function LessonEditorPage() {
  const { gradeId = "", lessonId = "" } = useRouteParams<"gradeId" | "lessonId">(
    "/editor/lessons/:gradeId/:lessonId"
  );
  const endpoint = `/api/editor/lessons/${gradeId}/${lessonId}`;

  const [lesson, setLesson]     = useState<LessonData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [raw, setRaw]           = useState("{}");
  const [tab, setTab]           = useState<"form" | "json">("form");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [moduleErrors, setModuleErrors] = useState<LessonModuleErrors>({});

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        const next = json?.success ? toLesson(json.data) : null;
        if (!res.ok || !next) {
          setLoadError(json?.message ?? `Could not load this lesson (${res.status}).`);
          return;
        }
        setLesson(next);
        setRaw(JSON.stringify(next, null, 2));
        setLoadError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("Network error — could not load this lesson.");
      });
    return () => controller.abort();
  }, [endpoint, reloadKey]);

  /**
   * Validates module links, then writes the whole lesson.
   *
   * On success the form and the Raw JSON text are both reset to what was
   * saved. Previously only one of them was, so saving the form and later
   * saving the JSON tab silently wrote the old values back.
   */
  async function persist(draft: LessonData) {
    const next: LessonData = { ...draft, modules: normalizeLessonModules(draft.modules) };
    const errors = validateLessonModules(next.modules);
    const failed = LESSON_MODULE_KEYS.filter((key) => errors[key]);

    setModuleErrors(errors);
    if (failed.length > 0) {
      setLesson(next);
      setTab("form");
      setMsg({ type: "err", text: `Check the module links: ${failed.map((key) => LESSON_MODULE_LABELS[key]).join(", ")}.` });
      return;
    }

    setSaving(true); setMsg(null);
    try {
      const res = await apiFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const serverErrors = (json?.errors ?? {}) as Record<string, string[]>;
        setModuleErrors(Object.fromEntries(
          LESSON_MODULE_KEYS.filter((key) => serverErrors[key]?.[0]).map((key) => [key, serverErrors[key][0]])
        ));
        setMsg({ type: "err", text: json?.message ?? `Save failed (${res.status}).` });
        return;
      }

      setLesson(next);
      setRaw(JSON.stringify(next, null, 2));
      setMsg({ type: "ok", text: json.message ?? "Lesson saved." });
    } catch {
      setMsg({ type: "err", text: "Network error — the lesson was not saved." });
    } finally {
      setSaving(false);
    }
  }

  function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (lesson) persist(lesson);
  }

  function saveJson(e: React.FormEvent) {
    e.preventDefault();
    let parsed: LessonData | null = null;
    try { parsed = toLesson(JSON.parse(raw)); } catch { /* reported below */ }
    if (!parsed) { setMsg({ type: "err", text: "Invalid JSON — the lesson must be a JSON object." }); return; }
    persist(parsed);
  }

  /** Carries unsaved edits across tabs so neither tab works from stale data. */
  function switchTab(next: "form" | "json") {
    if (next === tab || !lesson) return;
    if (next === "json") {
      setRaw(JSON.stringify(lesson, null, 2));
      setTab("json");
      return;
    }
    let parsed: LessonData | null = null;
    try { parsed = toLesson(JSON.parse(raw)); } catch { /* reported below */ }
    if (!parsed) {
      setMsg({ type: "err", text: "Fix the JSON syntax before switching back to the form." });
      return;
    }
    setLesson(parsed);
    setMsg(null);
    setTab("form");
  }

  function updateModule(key: LessonModuleKey, patch: Partial<LessonModuleConfig>) {
    setLesson((l) => l && { ...l, modules: { ...l.modules, [key]: { ...l.modules[key], ...patch } } });
    setModuleErrors((errors) => {
      if (!errors[key]) return errors;
      const rest = { ...errors };
      delete rest[key];
      return rest;
    });
  }

  if (loadError && !lesson) {
    return (
      <div className="ed-empty" style={{ marginTop: 60 }}>
        <p className="ed-error-msg">⚠️ {loadError}</p>
        <button type="button" className="ed-btn-secondary" onClick={load} style={{ marginTop: 12 }}>Try again</button>
      </div>
    );
  }

  if (!lesson) return <div className="ed-empty" style={{ marginTop: 60 }}>Loading lesson…</div>;

  function inp(
    label: string,
    value: string | number | boolean,
    onChange: (v: string) => void,
    type = "text"
  ) {
    return (
      <div className="ed-field">
        <label className="ed-label">{label}</label>
        <input
          className="ed-input"
          type={type}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="ed-page">
      <div className="ed-page-header">
        <div>
          <div className="ed-breadcrumb">
            <Link href="/editor/lessons" className="ed-bc-link">Lessons</Link>
            <span className="ed-bc-sep">›</span>
            <span>{gradeId.replace("grade","Grade ")}</span>
            <span className="ed-bc-sep">›</span>
            <span>{lessonId}</span>
          </div>
          <h2 className="ed-page-title">{lesson.title}</h2>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {lesson.modules.architectureModule.url ? (
            <a href={lesson.modules.architectureModule.url} target="_blank" rel="noopener noreferrer" className="ed-btn-secondary">
              👁 Preview
            </a>
          ) : (
            // Without a module URL this used to be a "#" link that did nothing.
            <span
              className="ed-btn-secondary"
              aria-disabled="true"
              title="Add an architecture module URL to preview this lesson"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
            >
              👁 Preview
            </span>
          )}
          <Link href={`/editor/lessons?grade=${gradeId}`} className="ed-btn-secondary">← Back</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="ed-tabs">
        <button type="button" className={`ed-tab${tab === "form" ? " active" : ""}`} onClick={() => switchTab("form")}>
          📋 Form Editor
        </button>
        <button type="button" className={`ed-tab${tab === "json" ? " active" : ""}`} onClick={() => switchTab("json")}>
          {} Raw JSON
        </button>
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "ed-success-txt" : "ed-error-msg"} style={{ marginBottom: 12 }} role="status">
          {msg.type === "ok" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* Form tab */}
      {tab === "form" && (
        <form onSubmit={saveForm}>
          <div className="ed-panel" style={{ marginBottom: 16 }}>
            <div className="ed-panel-header"><span className="ed-panel-title">📄 Basic Info</span></div>
            <div className="ed-panel-body">
              <div className="ed-form-grid">
                {inp("Title",       lesson.title,       (v) => setLesson((l) => l && { ...l, title: v }))}
                {inp("Description", lesson.description, (v) => setLesson((l) => l && { ...l, description: v }))}
                {inp("Chapter ID",  lesson.chapterId,   (v) => setLesson((l) => l && { ...l, chapterId: v }))}
                {inp("Chapter Title", lesson.chapterTitle, (v) => setLesson((l) => l && { ...l, chapterTitle: v }))}
                {inp("Est. Minutes", lesson.estimatedMinutes, (v) => setLesson((l) => l && { ...l, estimatedMinutes: parseInt(v,10)||0 }), "number")}
                {inp("Hero Visualizer Key", lesson.heroVisualizer, (v) => setLesson((l) => l && { ...l, heroVisualizer: v }))}
                <div className="ed-field ed-field-check">
                  <label className="ed-check-label">
                    <input type="checkbox" checked={!!lesson.locked}
                      onChange={(e) => setLesson((l) => l && { ...l, locked: e.target.checked })} />
                    Locked
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="ed-panel" style={{ marginBottom: 16 }}>
            <div className="ed-panel-header">
              <span className="ed-panel-title">🔗 Module URLs</span>
              <span className="ed-panel-link" style={{ fontSize: 11, cursor: "default" }}>
                A link is only required for enabled modules
              </span>
            </div>
            <div className="ed-panel-body">
              <div className="ed-form-grid">
                {LESSON_MODULE_KEYS.map((key) => {
                  const mod = lesson.modules[key];
                  const error = moduleErrors[key];
                  const inputId = `module-${key}`;
                  return (
                    <div key={key} className="ed-field">
                      <label className="ed-label" htmlFor={inputId}>{LESSON_MODULE_LABELS[key]}</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {/* type="text", not "url": the browser's URL check rejects
                            site paths like /student/lesson/video and silently
                            blocked the whole form from submitting. */}
                        <input
                          id={inputId}
                          className={`ed-input${error ? " invalid" : ""}`}
                          style={{ flex: 1 }}
                          type="text"
                          inputMode="url"
                          autoComplete="off"
                          placeholder={mod.enabled ? "/student/lesson/… or https://…" : "Optional while disabled"}
                          value={mod.url}
                          aria-invalid={!!error}
                          aria-describedby={`${inputId}-hint`}
                          onChange={(e) => updateModule(key, { url: e.target.value })}
                        />
                        <label className="ed-check-label" style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={mod.enabled}
                            onChange={(e) => updateModule(key, { enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                      </div>
                      <span id={`${inputId}-hint`} className={error ? "ed-field-error" : "ed-field-hint"}>
                        {error ?? (mod.enabled ? "Required while enabled." : "Disabled — link optional.")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button className="ed-btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "💾 Save Lesson"}
          </button>
        </form>
      )}

      {/* JSON tab */}
      {tab === "json" && (
        <form onSubmit={saveJson}>
          <div className="ed-panel">
            <div className="ed-panel-header">
              <span className="ed-panel-title">{} Raw JSON Editor</span>
              <span className="ed-panel-link" style={{ fontSize: 11 }}>Edit directly — be careful with syntax</span>
            </div>
            <div className="ed-panel-body" style={{ padding: 0 }}>
              <textarea
                className="ed-json-editor"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                spellCheck={false}
                rows={32}
              />
            </div>
          </div>
          <button className="ed-btn-primary" type="submit" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "Saving…" : "💾 Save JSON"}
          </button>
        </form>
      )}
    </div>
  );
}
