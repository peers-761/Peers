"use client";

// Admin: the COMPLETE online-test file of ONE student — not just marks.
// Question paper, every answer the student wrote, marks per question, teacher
// comment, rank in the class, and the full integrity (cheating) report.
// Can be printed or downloaded as one professional PDF.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "../../../../../../../components/AdminShell";
import { COLORS } from "../../../../../../../lib/theme";
import { downloadElementAsPdf, safeFileName } from "../../../../../../../lib/downloadPdf";
import {
  computeResult, autoMcqMarks, totalOutOf, flagLabel, isAlertFlag, alertCounts,
  SUBMIT_REASON_LABEL, testTypeLabel, tokenize, mistakeCount,
} from "../../../../../../../lib/onlineTestShared";

const NAVY = COLORS.navy;
const B = `1px solid ${COLORS.border}`;
const th = { textAlign: "left", padding: "7px 9px", border: B, background: COLORS.tint, fontSize: 12, color: NAVY };
const td = { padding: "7px 9px", border: B, fontSize: 12.5, verticalAlign: "top" };
const sec = { background: "#fff", border: B, borderRadius: 8, padding: "16px 18px", marginBottom: 14 };
const h = { fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 14.5, color: NAVY, margin: "0 0 10px", paddingBottom: 6, borderBottom: `2px solid ${NAVY}` };

function dt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
}
function tm(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Karachi" });
}
function gradeColor(g) {
  return { "A+": "#15803D", A: "#15803D", B: "#1D4ED8", C: "#8A5B00", D: "#C2410C", F: "#B91C1C" }[g] || NAVY;
}

export default function AdminStudentTestReportPage() {
  const { id, studentId } = useParams();
  const sid = decodeURIComponent(studentId);
  const [data, setData] = useState(null); // { test, attempt }
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [withPaper, setWithPaper] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, r] = await Promise.all([
          fetch(`/api/online-tests/${id}/attempt?studentId=${encodeURIComponent(sid)}`, { cache: "no-store" }),
          fetch(`/api/online-tests/${id}`, { cache: "no-store" }),
        ]);
        const ad = await a.json();
        if (!a.ok) throw new Error(ad.error || "Could not load this report.");
        setData(ad);
        const rd = await r.json().catch(() => ({}));
        if (r.ok) setRows(rd.rows || []);
      } catch (e) {
        setError(e.message || "Could not load this report.");
      }
    })();
  }, [id, sid]);

  async function download() {
    setDownloading(true);
    try {
      await downloadElementAsPdf(
        document.getElementById("online-test-report"),
        safeFileName("Online-Test-Report", data.attempt.studentName, data.test.title)
      );
    } catch (e) {
      alert(e.message || "Could not create the PDF.");
    }
    setDownloading(false);
  }

  if (error) return <AdminShell title="Online Test Report"><p style={{ color: COLORS.red, fontSize: 13 }}>{error}</p></AdminShell>;
  if (!data) return <AdminShell title="Online Test Report"><p style={{ color: COLORS.muted, fontSize: 13 }}>Loading...</p></AdminShell>;

  const { test, attempt: a } = data;
  const checked = !!a.checkedAt;
  const result = computeResult(test, a);
  const outOf = totalOutOf(test);
  const auto = autoMcqMarks(test, a);
  const flags = a.flags || [];
  const alerts = flags.filter((f) => isAlertFlag(f.type));
  const counts = alertCounts(flags);
  const pages = (test.pages || []).map((k) => `/api/image?key=${encodeURIComponent(k)}`);
  const classLabel = /^\d+$/.test(a.className || test.className) ? `Class ${a.className || test.className}` : a.className || test.className;

  // Class position among CHECKED students of this test.
  const scored = rows.filter((r) => r.checked && r.result).map((r) => r.result.obtained).sort((x, y) => y - x);
  const rank = checked && scored.length ? scored.findIndex((v) => v <= result.obtained) + 1 : null;
  const avg = scored.length ? Math.round((scored.reduce((t, v) => t + v, 0) / scored.length) * 10) / 10 : null;
  const top = scored.length ? scored[0] : null;

  const mcqRows = Array.from({ length: test.mcqCount }, (_, i) => i + 1).map((n) => {
    const given = a.answers?.mcq?.[n];
    const right = test.answerKey?.[n];
    return { n, given, right, ok: right ? given === right : null };
  });
  const mcqRight = mcqRows.filter((r) => r.ok).length;
  const mcqWrong = mcqRows.filter((r) => r.ok === false && r.given).length;
  const mcqSkipped = mcqRows.filter((r) => !r.given).length;

  const written = [
    ...Array.from({ length: test.shortCount }, (_, i) => ({ key: "S" + (i + 1), name: `Short Question ${i + 1}`, max: test.marksShort })),
    ...Array.from({ length: test.longCount }, (_, i) => ({ key: "L" + (i + 1), name: `Long Question ${i + 1}`, max: test.marksLong })),
  ];

  const sectionRows = [
    test.mcqCount > 0 && { name: `MCQs (${test.mcqCount})`, got: result.mcq, max: test.mcqCount * test.marksMcq },
    test.shortCount > 0 && { name: `Short questions (${test.shortCount})`, got: result.short, max: test.shortCount * test.marksShort },
    test.longCount > 0 && { name: `Long questions (${test.longCount})`, got: result.long, max: test.longCount * test.marksLong },
  ].filter(Boolean);

  const risk = alerts.length === 0 ? { t: "No suspicious activity", c: "#27500A", bg: "#EAF3DE" } : alerts.length < 4 ? { t: `Low concern — ${alerts.length} alert${alerts.length > 1 ? "s" : ""}`, c: "#8A5B00", bg: "#FCEFD6" } : { t: `High concern — ${alerts.length} alerts`, c: "#791F1F", bg: "#FCEBEB" };

  return (
    <AdminShell title="Online Test Report">
      <div style={{ maxWidth: 900 }}>
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <a href={`/admin/dashboard/online-tests/${id}`} style={{ fontSize: 13, color: NAVY, textDecoration: "none" }}>← Back to test</a>
          <span style={{ flex: 1 }} />
          {pages.length > 0 && (
            <label style={{ fontSize: 12.5, color: COLORS.ink, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={withPaper} onChange={(e) => setWithPaper(e.target.checked)} /> Include question paper
            </label>
          )}
          <button onClick={download} disabled={downloading} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", opacity: downloading ? 0.6 : 1 }}>
            {downloading ? "Preparing PDF..." : "Download full report (PDF)"}
          </button>
          <button onClick={() => window.print()} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}>Print</button>
        </div>

        <div id="online-test-report" style={{ background: "#fff" }}>
          {/* ---------- Letterhead ---------- */}
          <div style={{ ...sec, textAlign: "center", borderTop: `4px solid ${NAVY}` }}>
            <img src="/logo-full.png" alt="The PEERS Education System" style={{ height: 46, margin: "0 auto 6px", display: "block" }} />
            <p style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 19, color: NAVY, margin: "4px 0 2px" }}>Online Test — Detailed Report</p>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>Generated {dt(new Date().toISOString())} · Confidential — for school use</p>
          </div>

          {/* ---------- Student + test ---------- */}
          <div className="keep-together" style={sec}>
            <p style={h}>Student &amp; test details</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr><td style={{ ...td, ...{ fontWeight: 600, width: "18%", background: COLORS.tint } }}>Student</td><td style={td}>{a.studentName}</td><td style={{ ...td, fontWeight: 600, width: "18%", background: COLORS.tint }}>Father</td><td style={td}>{a.fatherName || "—"}</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Class</td><td style={td}>{classLabel} · {a.section || "—"}</td><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Roll / ID</td><td style={td}>{a.studentId}</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Test</td><td style={td}>{test.title}</td><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Type</td><td style={td}>{testTypeLabel(test.type)}</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Subject</td><td style={td}>{test.subject || "—"}</td><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Duration</td><td style={td}>{test.durationMin} minutes</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Checked by</td><td style={td}>{test.checkerName || "—"}{checked ? ` · ${dt(a.checkedAt)}` : ""}</td><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Test date</td><td style={td}>{dt(test.startedAt)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* ---------- Result ---------- */}
          <div className="keep-together" style={sec}>
            <p style={h}>Result</p>
            {!checked ? (
              <p style={{ fontSize: 13, color: "#8A5B00", margin: 0 }}>This paper has not been checked yet — marks below are provisional (MCQs only if an answer key was set).</p>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, margin: "8px 0 14px" }}>
              {[
                ["Marks", `${result.obtained} / ${outOf}`, NAVY],
                ["Percentage", `${result.percentage}%`, NAVY],
                ["Grade", result.grade, gradeColor(result.grade)],
                ["Position", rank ? `${rank} of ${scored.length}` : "—", NAVY],
                ["Class average", avg !== null ? `${avg} / ${outOf}` : "—", NAVY],
                ["Highest", top !== null ? `${top} / ${outOf}` : "—", NAVY],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: COLORS.tint, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 11, color: COLORS.muted }}>{label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 800, color }}>{value}</p>
                </div>
              ))}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Section</th><th style={{ ...th, textAlign: "center" }}>Obtained</th><th style={{ ...th, textAlign: "center" }}>Total</th><th style={{ ...th, textAlign: "center" }}>%</th></tr></thead>
              <tbody>
                {sectionRows.map((r) => (
                  <tr key={r.name}>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.got}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.max}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.max ? Math.round((r.got / r.max) * 100) : 0}%</td>
                  </tr>
                ))}
                <tr style={{ background: COLORS.tint, fontWeight: 700 }}>
                  <td style={td}>Total</td><td style={{ ...td, textAlign: "center" }}>{result.obtained}</td><td style={{ ...td, textAlign: "center" }}>{outOf}</td><td style={{ ...td, textAlign: "center" }}>{result.percentage}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ---------- MCQs ---------- */}
          {test.mcqCount > 0 && (
            <div style={sec}>
              <p style={h}>MCQs — answer by answer</p>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 8px" }}>
                {test.answerKey ? <>Correct <b style={{ color: "#27500A" }}>{mcqRight}</b> · Wrong <b style={{ color: "#791F1F" }}>{mcqWrong}</b> · Not attempted <b>{mcqSkipped}</b>{auto !== null ? ` · Marks ${auto}` : ""}</> : <>No answer key was set for this test — MCQ marks were entered by the teacher ({result.mcq}).</>}
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...th, width: 50 }}>Q</th><th style={{ ...th, textAlign: "center" }}>Student answered</th>{test.answerKey && <th style={{ ...th, textAlign: "center" }}>Correct answer</th>}{test.answerKey && <th style={{ ...th, textAlign: "center", width: 80 }}>Result</th>}</tr></thead>
                <tbody>
                  {mcqRows.map((r) => (
                    <tr key={r.n} className="keep-together" style={{ background: r.ok === false ? "#FFF6F6" : "transparent" }}>
                      <td style={td}>{r.n}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 600 }}>{r.given || "—"}</td>
                      {test.answerKey && <td style={{ ...td, textAlign: "center" }}>{r.right || "—"}</td>}
                      {test.answerKey && <td style={{ ...td, textAlign: "center", fontWeight: 700, color: r.ok ? "#27500A" : r.given ? "#791F1F" : COLORS.muted }}>{r.ok ? "✓ Correct" : r.given ? "✕ Wrong" : "Skipped"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- Written answers ---------- */}
          {written.length > 0 && (
            <div style={sec}>
              <p style={h}>Written answers</p>
              {written.map((q) => {
                const text = a.answers?.text?.[q.key] || "";
                const wrong = a.mistakes?.[q.key] || [];
                const got = Number(a.marks?.[q.key]) || 0;
                return (
                  <div key={q.key} className="keep-together" style={{ border: B, borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{q.name}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: got >= q.max * 0.5 ? "#27500A" : "#791F1F" }}>{checked ? `${got} / ${q.max}` : `— / ${q.max}`}</span>
                    </div>
                    <div style={{ background: COLORS.tint, borderRadius: 5, padding: "8px 10px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: text ? COLORS.ink : "#9A9A90" }}>
                      {text
                        ? tokenize(text).map((tok, i) =>
                            tok.isWord && wrong.includes(tok.wi) ? (
                              <span key={i} style={{ background: "#FCEBEB", color: "#791F1F", textDecoration: "underline wavy #C8102E" }}>{tok.t}</span>
                            ) : (
                              <span key={i}>{tok.t}</span>
                            )
                          )
                        : "No answer written"}
                    </div>
                    {wrong.length > 0 && <p style={{ fontSize: 11.5, color: "#791F1F", margin: "5px 0 0" }}>{wrong.length} word(s) marked wrong by the teacher</p>}
                  </div>
                );
              })}
              {mistakeCount(a.mistakes) > 0 && <p style={{ fontSize: 12, color: COLORS.muted, margin: "4px 0 0" }}>Total words marked wrong: {mistakeCount(a.mistakes)}</p>}
            </div>
          )}

          {/* ---------- Teacher comment ---------- */}
          {a.comment && (
            <div className="keep-together" style={{ ...sec, background: "#FFF9EA", borderColor: "#F0D48A" }}>
              <p style={h}>Teacher's comment</p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.comment}</p>
            </div>
          )}

          {/* ---------- Integrity ---------- */}
          <div style={sec}>
            <p style={h}>Test conduct &amp; integrity report</p>
            <div style={{ display: "inline-block", background: risk.bg, color: risk.c, fontWeight: 700, fontSize: 12.5, padding: "5px 12px", borderRadius: 5, marginBottom: 12 }}>{risk.t}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
              <tbody>
                <tr><td style={{ ...td, fontWeight: 600, width: "28%", background: COLORS.tint }}>Joined the test</td><td style={td}>{dt(a.enrolledAt)}</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Submitted</td><td style={td}>{dt(a.submittedAt)} — {SUBMIT_REASON_LABEL[a.submitReason] || "—"}</td></tr>
                <tr><td style={{ ...td, fontWeight: 600, background: COLORS.tint }}>Last seen online</td><td style={td}>{dt(a.lastSeen)}</td></tr>
              </tbody>
            </table>
            {Object.keys(counts).length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <thead><tr><th style={th}>Alert type</th><th style={{ ...th, width: 80, textAlign: "center" }}>Times</th></tr></thead>
                <tbody>
                  {Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([type, n]) => (
                    <tr key={type}><td style={td}>{flagLabel(type)}</td><td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#791F1F" }}>{n}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {flags.length > 0 ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: NAVY, margin: "0 0 4px" }}>Full timeline</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={{ ...th, width: 100 }}>Time</th><th style={th}>Event</th></tr></thead>
                  <tbody>
                    {flags.map((f) => (
                      <tr key={f.cid} className="keep-together">
                        <td style={td}>{tm(f.at)}</td>
                        <td style={{ ...td, color: isAlertFlag(f.type) ? "#791F1F" : COLORS.ink }}>{isAlertFlag(f.type) ? "⚠ " : ""}{flagLabel(f.type)}{f.detail ? ` (${f.detail})` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>Nothing was recorded during this test.</p>
            )}
          </div>

          {/* ---------- Question paper ---------- */}
          {withPaper && pages.length > 0 && (
            <div style={{ ...sec, pageBreakBefore: "always", breakBefore: "page" }}>
              <p style={h}>Question paper</p>
              {pages.map((src, i) => (
                <img key={src} src={src} alt={`Paper page ${i + 1}`} crossOrigin="anonymous" style={{ width: "100%", display: "block", border: B, marginBottom: 10 }} />
              ))}
            </div>
          )}

          <p style={{ fontSize: 10.5, color: "#9A9A90", textAlign: "center", margin: "10px 0 0" }}>
            The PEERS Education System · Online Test Report · {a.studentName} · {test.title}
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
