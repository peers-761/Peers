"use client";

import { useEffect, useState } from "react";
import { COLORS, CLASSES } from "../lib/theme";
import { gradeColor } from "../lib/testResultCalc";

function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

const STATUS = {
  draft: { text: "Draft", color: "#8A5B00", bg: "#FCEFD6" },
  published: { text: "Sent to parent", color: "#27500A", bg: "#EAF3DE" },
};

// showClassFilter: true for Incharge (sees every class), false for
// Teacher (already scoped server-side to their assigned classes).
// studentId: when given (Admin viewing one student's profile), shows every
// report — draft and published — for just that student, full detail,
// with the same View / Push / Delete controls as everywhere else.
export default function TestReportsList({ showClassFilter = false, studentId = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [view, setView] = useState(null); // full report object
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = studentId
        ? `?studentId=${encodeURIComponent(studentId)}`
        : classFilter !== "All" ? `?className=${classFilter}` : "";
      const res = await fetch(`/api/test-results${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load reports.");
      setRows(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load reports.");
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classFilter]);

  async function push(r) {
    setBusyId(r.id);
    const res = await fetch("/api/test-results/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: r.studentId, id: r.id }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) return alert(data.error || "Could not push to Parent Portal.");
    setView(null);
    load();
  }

  async function remove(r) {
    if (!confirm(`Delete the report "${r.testName}" for ${r.studentName}? This removes it from your records and from the Parent Portal. This cannot be undone.`)) return;
    setBusyId(r.id);
    const res = await fetch("/api/test-results", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: r.studentId, id: r.id }),
    });
    setBusyId("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return alert(d.error || "Could not delete the report.");
    }
    setView(null);
    load();
  }

  return (
    <div>
      {showClassFilter && !studentId && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["All", ...CLASSES].map((c) => (
            <button key={c} onClick={() => setClassFilter(c)}
              style={{
                padding: "6px 13px", fontSize: 12.5, fontWeight: 500, borderRadius: 5,
                border: `1px solid ${classFilter === c ? COLORS.navy : COLORS.border}`,
                background: classFilter === c ? COLORS.navy : "#fff",
                color: classFilter === c ? "#fff" : COLORS.ink, cursor: "pointer",
              }}>
              {c === "All" ? "All classes" : classLabel(c)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>No test reports yet.</p>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          {rows.map((r, i) => {
            const st = STATUS[r.status] || STATUS.draft;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "12px 16px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{r.studentName} <span style={{ fontWeight: 400, color: COLORS.muted, fontSize: 12.5 }}>· {classLabel(r.className)}</span></p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.muted }}>
                    {r.testName} · {r.totalObtained ?? r.totalMarks}/{r.totalOutOf} · {r.percentage}% ·{" "}
                    <span style={{ color: gradeColor(r.grade), fontWeight: 600 }}>{r.grade}</span>
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: "4px 10px", borderRadius: 4 }}>{st.text}</span>
                  <button onClick={() => setView(r)} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>View report</button>
                  <button onClick={() => remove(r)} disabled={busyId === r.id} style={{ background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 5, padding: "6px 12px", fontSize: 12, cursor: "pointer", opacity: busyId === r.id ? 0.5 : 1 }}>
                    {busyId === r.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view && (
        <div onClick={() => setView(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,18,48,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "auto", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <p style={{ margin: 0, fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 17, color: COLORS.navy }}>{view.testName}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: COLORS.muted }}>{view.studentName} · {classLabel(view.className)} · Roll {view.rollNo}</p>
              </div>
              <button onClick={() => setView(null)} style={{ border: "none", background: COLORS.tint, borderRadius: 6, width: 30, height: 30, fontSize: 16, cursor: "pointer" }}>×</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.tint }}>
                  <th style={{ textAlign: "left", padding: "7px 9px", border: `1px solid ${COLORS.border}` }}>Subject</th>
                  <th style={{ padding: "7px 9px", border: `1px solid ${COLORS.border}` }}>Obtained</th>
                  <th style={{ padding: "7px 9px", border: `1px solid ${COLORS.border}` }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(view.subjects || {}).map(([subj, m]) => (
                  <tr key={subj}>
                    <td style={{ padding: "6px 9px", border: `1px solid ${COLORS.border}` }}>{subj}</td>
                    <td style={{ textAlign: "center", padding: "6px 9px", border: `1px solid ${COLORS.border}` }}>{m.obtained}</td>
                    <td style={{ textAlign: "center", padding: "6px 9px", border: `1px solid ${COLORS.border}` }}>{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14, textAlign: "center" }}>
              <div style={{ background: COLORS.tint, borderRadius: 6, padding: "8px 0" }}><p style={{ fontSize: 10.5, color: COLORS.muted, margin: "0 0 2px" }}>Total</p><p style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{view.totalObtained ?? view.totalMarks}/{view.totalOutOf}</p></div>
              <div style={{ background: COLORS.tint, borderRadius: 6, padding: "8px 0" }}><p style={{ fontSize: 10.5, color: COLORS.muted, margin: "0 0 2px" }}>Average</p><p style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{view.average}</p></div>
              <div style={{ background: COLORS.tint, borderRadius: 6, padding: "8px 0" }}><p style={{ fontSize: 10.5, color: COLORS.muted, margin: "0 0 2px" }}>%</p><p style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{view.percentage}%</p></div>
              <div style={{ background: COLORS.tint, borderRadius: 6, padding: "8px 0" }}><p style={{ fontSize: 10.5, color: COLORS.muted, margin: "0 0 2px" }}>Grade</p><p style={{ fontSize: 14, fontWeight: 700, color: gradeColor(view.grade), margin: 0 }}>{view.grade}</p></div>
            </div>

            {(view.whatWasTheTest || view.marksNote || view.whatIsTheIssue || view.howToImprove) && (
              <div style={{ fontSize: 12, color: COLORS.ink, lineHeight: 1.6, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, marginBottom: 14 }}>
                {view.whatWasTheTest && <p style={{ margin: "0 0 4px" }}><strong>Test:</strong> {view.whatWasTheTest}</p>}
                {view.marksNote && <p style={{ margin: "0 0 4px" }}><strong>Notes:</strong> {view.marksNote}</p>}
                {view.whatIsTheIssue && <p style={{ margin: "0 0 4px" }}><strong>Issue:</strong> {view.whatIsTheIssue}</p>}
                {view.howToImprove && <p style={{ margin: 0 }}><strong>Correction:</strong> {view.howToImprove}</p>}
              </div>
            )}

            <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 14px" }}>
              Prepared by {view.preparedByRole || "staff"} · {view.status === "published" ? `Sent to parent on ${new Date(view.publishedAt).toLocaleDateString("en-GB")}` : "Not yet sent to parent"}
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {view.status !== "published" && (
                <button onClick={() => push(view)} disabled={busyId === view.id}
                  style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 16px", fontSize: 12.5, cursor: "pointer" }}>
                  {busyId === view.id ? "Pushing..." : "Push to Parent Portal"}
                </button>
              )}
              <button onClick={() => remove(view)} disabled={busyId === view.id}
                style={{ background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 5, padding: "9px 16px", fontSize: 12.5, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
