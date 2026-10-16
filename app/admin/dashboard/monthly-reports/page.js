"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, CLASSES, formatDateTime } from "../../../../lib/theme";

export default function MonthlyReportsPage() {
  const [className, setClassName] = useState("9");
  const [title, setTitle] = useState("");
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/monthly-tests?className=${encodeURIComponent(className)}`, { cache: "no-store" });
    if (res.ok) setTests(await res.json());
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/monthly-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className, title }),
    });
    setBusy(false);
    const d = await res.json();
    if (!res.ok) return setError(d.error || "Could not create.");
    window.location.href = `/admin/dashboard/monthly-reports/${d.id}`;
  }

  async function remove(t) {
    if (!confirm(`Delete "${t.title}" for this class? All marks entered in it will be lost.`)) return;
    await fetch(`/api/monthly-tests/${t.id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Monthly Test Reports">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 16px", maxWidth: 640 }}>
        Prepare the class-wide monthly test sheet for PTMs: choose a class, enter the marks, then print it or download it as one PDF.
        These sheets are for the school only and are never sent to the Parent Portal.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setClassName(c)}
            style={{ padding: "7px 14px", fontSize: 12.5, borderRadius: 5, border: `1px solid ${className === c ? COLORS.navy : COLORS.border}`, background: className === c ? COLORS.navy : "#fff", color: className === c ? "#fff" : COLORS.ink, cursor: "pointer" }}
          >
            {/^\d+$/.test(c) ? `Class ${c}` : c}
          </button>
        ))}
      </div>

      <form onSubmit={create} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test name, e.g. Monthly Test (July)" style={{ flex: 1, minWidth: 220, maxWidth: 340, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
        <button disabled={busy} type="submit" style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, cursor: "pointer" }}>
          {busy ? "Creating..." : `New test for ${/^\d+$/.test(className) ? "Class " + className : className}`}
        </button>
      </form>
      {error && <p style={{ color: COLORS.red, fontSize: 12.5 }}>{error}</p>}

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, marginTop: 14, overflow: "hidden" }}>
        {tests.map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: i ? `1px solid ${COLORS.border}` : "none" }}>
            <a href={`/admin/dashboard/monthly-reports/${t.id}`} style={{ textDecoration: "none", color: COLORS.navy, fontSize: 14, fontWeight: 500 }}>
              {t.title}
              <span style={{ display: "block", fontSize: 11.5, color: "#9A9A90", fontWeight: 400 }}>Created {formatDateTime(t.createdAt)}</span>
            </a>
            <button onClick={() => remove(t)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}>Delete</button>
          </div>
        ))}
        {tests.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No monthly tests for this class yet.</p>}
      </div>
    </AdminShell>
  );
}
