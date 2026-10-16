"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "../../../../../components/AdminShell";
import { COLORS } from "../../../../../lib/theme";
import { flagLabel, isAlertFlag, SUBMIT_REASON_LABEL, testTypeLabel } from "../../../../../lib/onlineTestShared";

function timeOnly(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Karachi" });
}

function fmtLeft(ms) {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function OnlineTestDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState("");
  const [offset, setOffset] = useState(0);

  async function load() {
    try {
      const res = await fetch(`/api/online-tests/${id}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not load.");
      setData(d);
      setOffset(new Date(d.serverNow).getTime() - Date.now());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const a = setInterval(load, 8000);
    const b = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    const res = await fetch(`/api/online-tests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json();
    setMsg(res.ok ? (action === "publish" ? `Results sent. ${d.notified} parent device(s) notified.` : "Done.") : d.error || "Could not do that.");
    load();
  }

  if (error) return <AdminShell title="Online Test"><p style={{ color: COLORS.red, fontSize: 13 }}>{error}</p></AdminShell>;
  if (!data) return <AdminShell title="Online Test"><p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p></AdminShell>;

  const { test, phase, rows, notEnrolled } = data;
  const leftMs = new Date(test.endsAt).getTime() - (now + offset);
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` };
  const td = { padding: "9px 10px", fontSize: 12.5, borderBottom: `1px solid ${COLORS.border}`, verticalAlign: "top" };

  return (
    <AdminShell title={test.title}>
      <div style={{ maxWidth: 980 }}>
        <a href="/admin/dashboard/online-tests" style={{ display: "inline-block", fontSize: 12.5, color: COLORS.navy, textDecoration: "none", marginBottom: 10 }}>← Back to all tests</a>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 12px" }}>
          {testTypeLabel(test.type)} · Class {test.className}{test.subject ? ` · ${test.subject}` : ""} · {test.durationMin} min · Checker: {test.checkerName || "-"}
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {phase === "live" && (
            <>
              <span style={{ background: COLORS.red, color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 4 }}>LIVE</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.navy }}>{fmtLeft(leftMs)}</span>
              <button onClick={() => act("end", "End the test now for everyone? Answers saved so far will be submitted.")} style={{ background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 5, padding: "6px 14px", fontSize: 12.5, cursor: "pointer" }}>End test now</button>
            </>
          )}
          {phase === "closed" && (
            <>
              <span style={{ fontSize: 13, color: "#8A5B00", fontWeight: 600 }}>Time is over. The checking teacher marks the papers; then results can be sent.</span>
              <button onClick={() => act("publish", "Send results to all parents now? This cannot be undone.")} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "7px 16px", fontSize: 12.5, cursor: "pointer" }}>Push results to parents</button>
            </>
          )}
          {phase === "published" && <span style={{ fontSize: 13, color: "#27500A", fontWeight: 600 }}>Results have been sent to parents.</span>}
        </div>
        {msg && <p style={{ fontSize: 13, color: COLORS.navy }}>{msg}</p>}

        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Student</th>
                <th style={th}>Status</th>
                <th style={th}>Answered</th>
                <th style={th}>Suspicious activity</th>
                <th style={th}>Marks</th>
                <th style={th}>Full report</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td style={td} colSpan={6}>Nobody has joined yet.</td></tr>
              )}
              {rows.map((r) => {
                const alerts = r.flags.filter((f) => isAlertFlag(f.type));
                const isOpen = open === r.studentId;
                return (
                  <Fragment key={r.studentId}>
                    <tr style={{ background: alerts.length > 0 ? "#FFF8F6" : "#fff" }}>
                      <td style={td}>
                        <strong>{r.studentName}</strong>
                        <div style={{ fontSize: 11, color: "#9A9A90" }}>{r.section} · joined {timeOnly(r.enrolledAt)}</div>
                      </td>
                      <td style={td}>
                        {r.submittedAt ? (
                          <span style={{ color: r.submitReason === "student" ? "#27500A" : "#8A5B00" }}>{SUBMIT_REASON_LABEL[r.submitReason] || "Submitted"}<div style={{ fontSize: 11, color: "#9A9A90" }}>{timeOnly(r.submittedAt)}</div></span>
                        ) : r.online ? (
                          <span style={{ color: "#27500A", fontWeight: 600 }}>● Writing now</span>
                        ) : (
                          <span style={{ color: COLORS.red }}>○ Offline (last seen {timeOnly(r.lastSeen)})</span>
                        )}
                      </td>
                      <td style={td}>{r.answeredMcq} MCQ · {r.answeredText} written</td>
                      <td style={td}>
                        {alerts.length === 0 ? (
                          <span style={{ color: "#27500A" }}>Nothing unusual</span>
                        ) : (
                          <button onClick={() => setOpen(isOpen ? null : r.studentId)} style={{ background: "#FCEBEB", color: "#791F1F", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            {alerts.length} alert{alerts.length > 1 ? "s" : ""} {isOpen ? "▲" : "▼"}
                          </button>
                        )}
                      </td>
                      <td style={td}>{r.result ? `${r.result.obtained} / ${r.result.outOf} (${r.result.percentage}%)` : r.checked ? "-" : "Not checked"}</td>
                      <td style={td}>
                        {phase === "live" ? (
                          <span style={{ fontSize: 11.5, color: "#9A9A90" }}>After test</span>
                        ) : (
                          <a href={`/admin/dashboard/online-tests/${id}/student/${encodeURIComponent(r.studentId)}`} style={{ background: COLORS.navy, color: "#fff", textDecoration: "none", borderRadius: 4, padding: "5px 10px", fontSize: 12, whiteSpace: "nowrap" }}>View / PDF</a>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td style={{ ...td, background: "#FCFCFA" }} colSpan={6}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 6px", color: COLORS.navy }}>Cheating report — {r.studentName}</p>
                          {r.flags.map((f) => (
                            <p key={f.cid} style={{ fontSize: 12, margin: "2px 0", color: isAlertFlag(f.type) ? "#791F1F" : "#5A5A52" }}>
                              {timeOnly(f.at)} — {flagLabel(f.type)}{f.detail ? ` (${f.detail})` : ""}
                            </p>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {notEnrolled.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 6px" }}>Not enrolled ({notEnrolled.length})</p>
            <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>{notEnrolled.map((s) => s.studentName).join(", ")}</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
