"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AdminShell from "../../../../../components/AdminShell";
import { COLORS } from "../../../../../lib/theme";
import { downloadElementAsPdf, safeFileName } from "../../../../../lib/downloadPdf";
import TestReportsList from "../../../../../components/TestReportsList";

const card = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 18, marginBottom: 18 };
const h = { fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 15, color: COLORS.navy, margin: "0 0 12px" };

export default function StudentProfilePage() {
  const { id } = useParams();
  const sp = useSearchParams();
  const className = sp.get("class");
  const isNew = sp.get("new") === "1";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin-student?id=${encodeURIComponent(decodeURIComponent(id))}&class=${encodeURIComponent(className || "")}`, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Could not load the student.");
      return;
    }
    setData(d);
    setItems(Object.fromEntries(d.feeItems.map((f) => [f.key, d.challan.items?.[f.key] ?? 0])));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNew && data) document.getElementById("fee-voucher")?.scrollIntoView({ behavior: "smooth" });
  }, [isNew, data]);

  async function saveFee() {
    setSaving(true);
    setSaved("");
    const res = await fetch("/api/receipt-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: data.student.id, month: data.month, items }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved("Fee voucher saved.");
      load();
    } else {
      setSaved((await res.json()).error || "Could not save.");
    }
  }

  async function setStatus(status) {
    const isPaid = data.challan.status === "verified";
    const msg = status === "verified"
      ? `Mark ${data.student.name}'s ${data.month} fee as PAID (Rs. ${total.toLocaleString("en-PK")})?`
      : `Undo payment for ${data.student.name} (${data.month})? The voucher becomes UNPAID again. Use this only if it was marked Paid by mistake.`;
    if (!confirm(msg)) return;
    setSaving(true);
    setSaved("");
    const res = await fetch("/api/receipt-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: data.student.id, month: data.month, status }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(status === "verified" ? "Marked as paid." : isPaid ? "Payment undone — voucher is unpaid again." : "Updated.");
      load();
    } else {
      setSaved((await res.json().catch(() => ({}))).error || "Could not update.");
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadElementAsPdf(document.getElementById("profile-report"), safeFileName("Student-Report", data.student.name));
    } catch (e) {
      alert(e.message || "Could not create the PDF.");
    }
    setDownloading(false);
  }

  if (error) return <AdminShell title="Student"><p style={{ color: COLORS.red, fontSize: 13 }}>{error}</p></AdminShell>;
  if (!data) return <AdminShell title="Student"><p style={{ color: COLORS.muted, fontSize: 13 }}>Loading...</p></AdminShell>;

  const { student, attendance, monthlyRows, remarks, remarksSources, challan, onlineTests = [] } = data;
  const classLabel = /^\d+$/.test(student.className) ? `Class ${student.className}` : student.className;
  const total = Object.values(items).reduce((t, v) => t + (Number(v) || 0), 0);
  const th = { textAlign: "left", padding: "7px 9px", border: `1px solid ${COLORS.border}`, background: COLORS.tint, fontSize: 12.5 };
  const td = { padding: "7px 9px", border: `1px solid ${COLORS.border}`, fontSize: 13 };

  return (
    <AdminShell title={student.name}>
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <a href="/admin/dashboard/students" style={{ fontSize: 13, color: COLORS.navy }}>← Back to students</a>
        <span style={{ flex: 1 }} />
        <button onClick={handleDownload} disabled={downloading} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>
          {downloading ? "Preparing PDF..." : "Download full report (PDF)"}
        </button>
        <button onClick={() => window.print()} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>
          Print
        </button>
      </div>

      <div id="profile-report">
        <div style={card}>
          <p style={{ ...h, fontSize: 18 }}>{student.name}</p>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.8 }}>
            <strong>Class:</strong> {classLabel} ({student.section}) &nbsp;·&nbsp; <strong>Father:</strong> {student.fatherName || "—"} &nbsp;·&nbsp; <strong>Roll No / Login ID:</strong> {student.rollNo || student.id}
            <br />
            <strong>Parent phone:</strong> {student.parentPhone || "—"}
            <span className="no-print"> &nbsp;·&nbsp; <strong>Parent PIN:</strong> {student.parentPassword || "—"}</span>
          </p>
        </div>

        <div className="keep-together" style={card}>
          <p style={h}>Overall remarks</p>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{remarks}</p>
          {remarksSources && (remarksSources.monthlyTestReports > 0 || remarksSources.testSessionReports > 0) && (
            <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "10px 0 0" }}>
              Based on {remarksSources.monthlyTestReports} Monthly Test Report{remarksSources.monthlyTestReports === 1 ? "" : "s"} and{" "}
              {remarksSources.testSessionReports} Test Session Report{remarksSources.testSessionReports === 1 ? "" : "s"}, plus attendance history.
            </p>
          )}
        </div>

        <div className="keep-together" style={card}>
          <p style={h}>Attendance</p>
          {attendance.total === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>No attendance has been marked yet.</p>
          ) : (
            <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.8 }}>
              <strong>{attendance.pct}%</strong> present — {attendance.present} present, {attendance.absent} absent, {attendance.leave} on leave (out of {attendance.total} marked days).
            </p>
          )}
        </div>

        <div style={card}>
          <p style={h}>Monthly test results</p>
          {monthlyRows.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>No monthly tests yet.</p>
          ) : (
            monthlyRows.map((r, i) => (
              <div key={r.testId + i} className="keep-together" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 6px" }}>
                  {r.title} — {r.obtained}/{r.total} ({r.percentage}%, Grade {r.grade})
                </p>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>{r.subjects.map((s) => <th key={s.name} style={th}>{s.name}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>{r.subjects.map((s) => <td key={s.name} style={td}>{s.obtained ?? "—"} / {s.total}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        <div className="no-print" style={card}>
          <p style={h}>Online tests</p>
          {onlineTests.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>This student has not taken any online test yet.</p>
          ) : (
            <div>
              <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 10px" }}>Tap &ldquo;Full report&rdquo; to see the whole paper, every answer, marks, rank, the cheating report — and to download it as a PDF.</p>
              {onlineTests.map((t, i) => (
                <div key={t.testId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{t.title}{t.subject ? <span style={{ fontWeight: 400, color: COLORS.muted }}> · {t.subject}</span> : null}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.muted }}>
                      {t.checked ? `${t.obtained}/${t.outOf} · ${t.percentage}% · Grade ${t.grade}` : "Not checked yet"}
                      {t.alerts > 0 && <span style={{ color: "#791F1F", fontWeight: 600 }}> · {t.alerts} alert{t.alerts > 1 ? "s" : ""}</span>}
                    </p>
                  </div>
                  <a href={`/admin/dashboard/online-tests/${t.testId}/student/${encodeURIComponent(student.id)}`} style={{ background: COLORS.navy, color: "#fff", textDecoration: "none", borderRadius: 5, padding: "6px 12px", fontSize: 12 }}>Full report</a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="no-print" style={card}>
          <p style={h}>Test session reports</p>
          <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 12px" }}>
            Every report prepared by a Teacher or the Incharge for this student — draft and already-sent-to-parent
            alike. Tap &ldquo;View report&rdquo; for the full subject breakdown, or to push/delete it.
          </p>
          <TestReportsList studentId={student.id} />
        </div>
      </div>

      <div id="fee-voucher" className="no-print" style={{ ...card, border: isNew ? `2px solid ${COLORS.gold}` : card.border }}>
        <p style={h}>Fee voucher — {data.month}</p>
        {isNew && <p style={{ fontSize: 12.5, color: "#7A6220", margin: "0 0 12px" }}>Student added. Enter the fee for this student below and save — the voucher is ready.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          {data.feeItems.map((f) => (
            <label key={f.key} style={{ fontSize: 12, color: COLORS.muted }}>
              {f.label}
              <input
                type="number"
                min="0"
                value={items[f.key] ?? 0}
                onChange={(e) => setItems({ ...items, [f.key]: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 13.5, border: "1px solid #DBD8CC", borderRadius: 5 }}
              />
            </label>
          ))}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: "14px 0 10px" }}>Total due: Rs. {total.toLocaleString("en-PK")}/- &nbsp; <span style={{ fontWeight: 400, fontSize: 12, color: COLORS.muted }}>Status: {challan.status}</span></p>
        <button onClick={saveFee} disabled={saving} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save fee voucher"}
        </button>
        <a href={`/api/fee-challans/pdf?studentId=${encodeURIComponent(student.id)}&month=${data.month}`} target="_blank" rel="noreferrer" style={{ marginLeft: 14, fontSize: 13, color: COLORS.navy }}>Open voucher PDF</a>
        {saved && <span style={{ marginLeft: 12, fontSize: 12.5, color: COLORS.muted }}>{saved}</span>}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {challan.status !== "verified" ? (
            <button onClick={() => setStatus("verified")} disabled={saving} style={{ background: "#27500A", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>
              Mark as Paid
            </button>
          ) : (
            <button onClick={() => setStatus("unpaid")} disabled={saving} style={{ background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>
              Undo (Mark Unpaid)
            </button>
          )}
          <span style={{ fontSize: 11.5, color: COLORS.muted }}>Marked paid by mistake? Undo puts it back to unpaid.</span>
        </div>
      </div>
    </AdminShell>
  );
}
