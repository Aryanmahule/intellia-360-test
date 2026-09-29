"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRouteParams } from "@/lib/route-params";

export default function CurriculumEditorPage() {
  const gradeId = useRouteParams<"gradeId">("/editor/curriculum/:gradeId").gradeId ?? "";
  const [raw, setRaw]         = useState("");
  const [parsed, setParsed]   = useState<unknown>(null);
  const [tab, setTab]         = useState<"tree" | "json">("tree");
  const [dirty, setDirty]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    if (!gradeId) return;
    apiFetch(`/api/editor/curriculum/${gradeId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const text = JSON.stringify(j.data, null, 2);
          setRaw(text);
          setParsed(j.data);
          setDirty(false);
        }
      });
  }, [gradeId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    let body: unknown;
    try { body = JSON.parse(raw); } catch { setMsg({ type: "err", text: "Invalid JSON — fix syntax before saving." }); return; }
    setSaving(true); setMsg(null);
    const r = await apiFetch(`/api/editor/curriculum/${gradeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setSaving(false);
    if (r.success) { setMsg({ type: "ok", text: "curriculum.json saved!" }); setDirty(false); load(); }
    else setMsg({ type: "err", text: r.message });
  }

  // ── Tree renderer ─────────────────────────────────────────────────────────
  function TreeView({ data }: { data: unknown; depth?: number }) {
    if (data === null || data === undefined) return <span className="ed-tree-null">null</span>;
    if (typeof data === "boolean") return <span className="ed-tree-bool">{String(data)}</span>;
    if (typeof data === "number") return <span className="ed-tree-num">{data}</span>;
    if (typeof data === "string") return <span className="ed-tree-str">&quot;{data}&quot;</span>;
    if (Array.isArray(data)) {
      return (
        <details open className="ed-tree-details">
          <summary className="ed-tree-summary">[ {data.length} items ]</summary>
          <div className="ed-tree-children">
            {data.map((item, i) => (
              <div key={i} className="ed-tree-row">
                <span className="ed-tree-key">{i}</span>
                <TreeView data={item} />
              </div>
            ))}
          </div>
        </details>
      );
    }
    if (typeof data === "object") {
      const entries = Object.entries(data as Record<string, unknown>);
      return (
        <details open className="ed-tree-details">
          <summary className="ed-tree-summary">{"{ " + entries.length + " keys }"}</summary>
          <div className="ed-tree-children">
            {entries.map(([k, v]) => (
              <div key={k} className="ed-tree-row">
                <span className="ed-tree-key">{k}:</span>
                <TreeView data={v} />
              </div>
            ))}
          </div>
        </details>
      );
    }
    return <span>{String(data)}</span>;
  }

  return (
    <div className="ed-page">
      <div className="ed-page-header">
        <div>
          <div className="ed-breadcrumb">
            <Link href="/editor/curriculum" className="ed-bc-link">Curriculum</Link>
            <span className="ed-bc-sep">›</span>
            <span>{gradeId.replace("grade", "Grade ")}</span>
          </div>
          <h2 className="ed-page-title">
            curriculum.json — {gradeId.replace("grade", "Grade ")}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {dirty && <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>● Unsaved changes</span>}
          <button className="ed-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
          <Link href="/editor/curriculum" className="ed-btn-secondary">← Back</Link>
        </div>
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "ed-success-txt" : "ed-error-msg"} style={{ marginBottom: 12 }}>
          {msg.type === "ok" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="ed-tabs">
        <button className={`ed-tab${tab === "tree" ? " active" : ""}`} onClick={() => setTab("tree")}>
          🌲 Tree View
        </button>
        <button className={`ed-tab${tab === "json" ? " active" : ""}`} onClick={() => setTab("json")}>
          {} JSON Editor
        </button>
      </div>

      {/* Tree view — read-only inspector */}
      {tab === "tree" && (
        <div className="ed-panel">
          <div className="ed-panel-header">
            <span className="ed-panel-title">🌲 Structure Inspector (read-only)</span>
            <span className="ed-panel-link" style={{ fontSize: 11 }}>Switch to JSON tab to edit</span>
          </div>
          <div className="ed-panel-body ed-tree-root">
            {parsed ? <TreeView data={parsed} /> : <div className="ed-empty">Loading…</div>}
          </div>
        </div>
      )}

      {/* JSON editor */}
      {tab === "json" && (
        <div className="ed-panel">
          <div className="ed-panel-header">
            <span className="ed-panel-title">{} JSON Editor</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ed-panel-link" onClick={load}>↻ Reload from disk</button>
            </div>
          </div>
          <div className="ed-panel-body" style={{ padding: 0 }}>
            <textarea
              className="ed-json-editor"
              value={raw}
              rows={36}
              spellCheck={false}
              onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
