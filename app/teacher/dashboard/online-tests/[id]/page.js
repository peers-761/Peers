"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COLORS } from "../../../../../lib/theme";
import PaperPages from "../../../../../components/PaperPages";
import { flagLabel, isAlertFlag, computeResult, autoMcqMarks, SUBMIT_REASON_LABEL, tokenize, mistakeCount } from "../../../../../lib/onlineTestShared";

const numInput = { width: 64, padding: "5px 6px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, textAlign: "center" };

function timeOnly(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Karachi" });
}

export default function TeacherCheckPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null); // { test, attempt }
  const [marks, setMarks] = useState({});
  const [mistakes, setMistakes] = useState({}); // { S1: [wordIndex, ...], L2: [...] }
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/online-tests/${id}`, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) return setError(d.error || "Could not load.");
    setData(d);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleMistake(key, wi) {
    setMistakes((m) => {
      const cur = m[key] || [];
      const next = cur.includes(wi) ? cur.filter((n) => n !== wi) : [...cur, wi];
      return { ...m, [key]: next };
    });
  }

  async function openAttempt(studentId) {
    setMsg("");
    const res = await fetch(`/api/online-tests/${id}/attempt?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error || "Could not open.");
    setCurrent(d);
    const m = {};
    for (const [k, v] of Object.entries(d.attempt.marks || {})) m[k] = String(v);
    setMarks(m);
    setMistakes(d.attempt.mistakes || {});
    setComment(d.attempt.comment || "");
    window.scrollTo(0, 0);
  }

  async function saveMarks() {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/online-tests/${id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveMarks", studentId: current.attempt.studentId, marks, comment, mistakes }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setMsg(d.error || "Could not save.");
    await load();
    setMsg("Saved ✓");
    // go to the next unchecked student
    const list = data.rows;
    const idx = list.findIndex((r) => r.studentId === current.attempt.studentId);
    const next = list.slice(idx + 1).find((r) => !r.checked) || list.find((r) => !r.checked && r.studentId !== current.attempt.studentId);
    if (next) openAttempt(next.studentId);
    else setCurrent(null);
  }

  async function publish() {
    const unchecked = data.rows.filter((r) => !r.checked).length;
    const text = unchecked > 0 ? `${unchecked} student(s) are not checked yet. Send results anyway?` : "Send the results to all parents now? This cannot be undone.";
    if (!confirm(text)) return;
    const res = await fetch(`/api/online-tests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish" }) });
    const d = await res.json();
    setMsg(res.ok ? `Results sent. ${d.notified} parent device(s) notified.` : d.error || "Could not send.");
    load();
  }

  const header = (
    <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>{data?.test?.title || "Check test"}</p>
      <a href="/teacher/dashboard/online-tests" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>Back</a>
    </div>
  );

  if (error) return <div>{header}<p style={{ padding: 24, color: COLORS.red, fontSize: 13 }}>{error}</p></div>;
  if (!data) return <div>{header}<p style={{ padding: 24, fontSize: 13, color: COLORS.muted }}>Loading...</p></div>;

  const { test, phase, rows } = data;

  // ---------- one student's paper ----------
  if (current) {
    const a = current.attempt;
    const preview = computeResult(test, { ...a, marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v])) });
    const auto = autoMcqMarks(test, a);
    const alerts = (a.flags || []).filter((f) => isAlertFlag(f.type));
    const pages = (test.pages || []).map((k) => `/api/image?key=${encodeURIComponent(k)}`);
    return (
      <div style={{ minHeight: "100vh", background: COLORS.tint }}>
        {header}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
          <button onClick={() => setCurrent(null)} style={{ background: "none", border: "none", color: COLORS.navy, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 10 }}>← All students</button>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 18, color: COLORS.navy, margin: "0 0 2px" }}>{a.studentName}</p>
          <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 12px" }}>{SUBMIT_REASON_LABEL[a.submitReason] || ""}</p>

          {alerts.length > 0 && (
            <div style={{ background: "#FCEBEB", border: "1px solid #F1C0C0", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#791F1F", margin: "0 0 4px" }}>Suspicious activity ({alerts.length})</p>
              {a.flags.map((f) => (
                <p key={f.cid} style={{ fontSize: 12, margin: "2px 0", color: isAlertFlag(f.type) ? "#791F1F" : "#5A5A52" }}>
                  {timeOnly(f.at)} — {flagLabel(f.type)}{f.detail ? ` (${f.detail})` : ""}
                </p>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "start" }}>
            <div><PaperPages pages={pages} /></div>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 16 }}>
              {test.mcqCount > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 8px" }}>MCQs</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Array.from({ length: test.mcqCount }, (_, i) => i + 1).map((n) => {
                      const given = a.answers?.mcq?.[n];
                      const right = test.answerKey?.[n];
                      const ok = right && given === right;
                      return (
                        <span key={n} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, background: !right ? "#EEEDE6" : ok ? "#EAF3DE" : "#FCEBEB", color: !right ? COLORS.ink : ok ? "#27500A" : "#791F1F" }}>
                          {n}: {given || "–"}{right && !ok ? ` (ans ${right})` : ""}
                        </span>
                      );
                    })}
                  </div>
                  {auto !== null ? (
                    <p style={{ fontSize: 12.5, margin: "8px 0 0", color: COLORS.muted }}>MCQ marks (automatic): <strong>{auto}</strong></p>
                  ) : (
                    <p style={{ fontSize: 12.5, margin: "8px 0 0" }}>
                      MCQ marks: <input style={numInput} inputMode="decimal" value={marks.mcq ?? ""} onChange={(e) => setMarks((m) => ({ ...m, mcq: e.target.value }))} /> / {test.mcqCount * test.marksMcq}
                    </p>
                  )}
                </div>
              )}

              {[["S", test.shortCount, "Short question", test.marksShort], ["L", test.longCount, "Long question", test.marksLong]].map(([p, count, name, max]) =>
                Array.from({ length: count }, (_, i) => i + 1).map((n) => (
                  <div key={p + n} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>{name} {n}</span>
                      <span style={{ fontSize: 12.5 }}>
                        <input style={numInput} inputMode="decimal" value={marks[p + n] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [p + n]: e.target.value }))} /> / {max}
                      </span>
                    </div>
                    <div style={{ background: COLORS.tint, borderRadius: 6, padding: "8px 10px", fontSize: 13, lineHeight: 1.7, minHeight: 36, color: a.answers?.text?.[p + n] ? COLORS.ink : "#9A9A90" }}>
                      {a.answers?.text?.[p + n]
                        ? tokenize(a.answers.text[p + n]).map((tok, ti) =>
                            tok.isWord ? (
                              <span
                                key={ti}
                                onClick={() => toggleMistake(p + n, tok.wi)}
                                title="Tap a wrong word to mark it"
                                style={{
                                  cursor: "pointer",
                                  borderRadius: 3,
                                  padding: "0 1px",
                                  color: (mistakes[p + n] || []).includes(tok.wi) ? "#791F1F" : "inherit",
                                  background: (mistakes[p + n] || []).includes(tok.wi) ? "#FCEBEB" : "transparent",
                                  textDecoration: (mistakes[p + n] || []).includes(tok.wi) ? "underline wavy #C8102E" : "none",
                                }}
                              >
                                {tok.t}
                              </span>
                            ) : (
                              <span key={ti}>{tok.t}</span>
                            )
                          )
                        : "No answer written"}
                    </div>
                    {a.answers?.text?.[p + n] && (mistakes[p + n] || []).length > 0 && (
                      <p style={{ fontSize: 11.5, color: "#791F1F", margin: "4px 0 0" }}>{(mistakes[p + n] || []).length} word(s) marked wrong — tap a word again to unmark</p>
                    )}
                  </div>
                ))
              )}

              <label style={{ fontSize: 12, color: COLORS.muted }}>Teacher's comment (optional)</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} style={{ width: "100%", boxSizing: "border-box", padding: 8, fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, margin: "4px 0 12px" }} />

              <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 4px" }}>Tap any word in an answer above to mark it as a mistake — {mistakeCount(mistakes)} marked so far.</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, margin: "0 0 10px" }}>Total: {preview.obtained} / {preview.outOf} ({preview.percentage}%)</p>
              <button onClick={saveMarks} disabled={saving} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "10px 22px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving..." : "Save & next"}
              </button>
              {msg && <span style={{ marginLeft: 10, fontSize: 12.5, color: msg.startsWith("Saved") ? "#27500A" : COLORS.red }}>{msg}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- list of students ----------
  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      {header}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px" }}>
        {phase === "live" && <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600 }}>The test is still running. Checking opens when the time is over.</p>}
        {msg && <p style={{ fontSize: 13, color: COLORS.navy }}>{msg}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {rows.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>Nobody joined this test.</p>}
          {rows.map((r) => {
            const alerts = r.flags.filter((f) => isAlertFlag(f.type)).length;
            return (
              <button key={r.studentId} disabled={phase === "live"} onClick={() => openAttempt(r.studentId)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 16px", cursor: phase === "live" ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>
                  <strong style={{ fontSize: 14, color: COLORS.ink }}>{r.studentName}</strong>
                  <span style={{ display: "block", fontSize: 11.5, color: "#9A9A90" }}>{SUBMIT_REASON_LABEL[r.submitReason] || "Writing..."}</span>
                </span>
                <span style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  {alerts > 0 && <span style={{ background: "#FCEBEB", color: "#791F1F", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>{alerts} alert{alerts > 1 ? "s" : ""}</span>}
                  <span style={{ background: r.checked ? "#EAF3DE" : "#FCEFD6", color: r.checked ? "#27500A" : "#8A5B00", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                    {r.checked ? `${r.result?.obtained}/${r.result?.outOf}` : "Not checked"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {phase === "closed" && (
          <button onClick={publish} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "11px 22px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>
            Checking complete — push results to parents
          </button>
        )}
        {phase === "published" && <p style={{ fontSize: 13, color: "#27500A", fontWeight: 600 }}>Results have been sent to parents.</p>}
      </div>
    </div>
  );
}
