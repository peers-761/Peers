"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";
import { TEST_TYPES, testTypeLabel } from "../../../../lib/onlineTestShared";

const input = { padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 12, color: COLORS.muted, display: "block", margin: "0 0 4px" };

const PHASE = {
  draft: { text: "Draft", color: "#5A5A52", bg: "#EEEDE6" },
  live: { text: "LIVE", color: "#fff", bg: "#C8102E" },
  closed: { text: "Time over – being checked", color: "#8A5B00", bg: "#FCEFD6" },
  published: { text: "Results sent", color: "#27500A", bg: "#EAF3DE" },
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the PDF reader. Check your internet."));
    document.head.appendChild(s);
  });
}

// Turns every page of the PDF into a JPEG picture (in the browser).
async function pdfToImages(file, onProgress) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    onProgress(`Reading page ${n} of ${pdf.numPages}...`);
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1400 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.75));
  }
  return images;
}

export default function OnlineTestsAdminPage() {
  const [tests, setTests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [runFor, setRunFor] = useState(null); // test being executed
  const [checker, setChecker] = useState("");

  const [f, setF] = useState({
    title: "", type: "unit", className: "9", subject: "", durationMin: "30",
    mcqCount: "10", shortCount: "5", longCount: "3", marksMcq: "1", marksShort: "2", marksLong: "5", answerKey: "",
  });
  const [file, setFile] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const [detected, setDetected] = useState(null); // breakdown for review
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  function fileToDataUrl(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Could not read the file."));
      r.readAsDataURL(f);
    });
  }

  // Reads the chosen PDF, guesses how many MCQ/Short/Long questions it
  // has, and fills those fields in (still editable) — see analyze-pdf.
  async function autoDetect() {
    if (!file) return setDetectMsg("Choose the test PDF first.");
    setDetecting(true);
    setDetectMsg("Reading the paper...");
    setDetected(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/online-tests/analyze-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ? `${data.error || "Could not read that PDF."} (${data.detail})` : (data.error || "Could not read that PDF."));
      setF((v) => ({
        ...v,
        mcqCount: String(data.mcqCount),
        shortCount: String(data.shortCount),
        longCount: String(data.longCount),
        marksMcq: String(data.marksMcq),
        marksShort: String(data.marksShort),
        marksLong: String(data.marksLong),
      }));
      setDetected(data);
      setDetectMsg(data.warning || `Detected ${data.totalQuestions} question(s). Please double-check the numbers below before saving.`);
    } catch (err) {
      setDetectMsg(err.message || "Could not read that PDF.");
    }
    setDetecting(false);
  }

  async function load() {
    const [t, tc] = await Promise.all([
      fetch("/api/online-tests", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/teachers", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTests(Array.isArray(t) ? t : []);
    setTeachers(Array.isArray(tc) ? tc : []);
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  async function createTest(e) {
    e.preventDefault();
    setMsg("");
    if (!file) return setMsg("Please choose the test PDF.");
    setBusy("Creating test...");
    try {
      const res = await fetch("/api/online-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const test = await res.json();
      if (!res.ok) throw new Error(test.error || "Could not create test.");

      const images = await pdfToImages(file, setBusy);
      const keys = [];
      for (let i = 0; i < images.length; i++) {
        setBusy(`Uploading page ${i + 1} of ${images.length}...`);
        const up = await fetch(`/api/online-tests/${test.id}/pages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, dataUrl: images[i] }) });
        const data = await up.json();
        if (!up.ok) throw new Error(data.error || "Page upload failed.");
        keys.push(data.key);
      }
      const done = await fetch(`/api/online-tests/${test.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setPages", pages: keys }) });
      if (!done.ok) throw new Error("Could not save the pages.");
      setMsg("Test saved as draft. Press “Execute test” when you want to start it.");
      setShowForm(false);
      setFile(null);
      load();
    } catch (err) {
      setMsg(err.message || "Something went wrong. Please try again.");
    }
    setBusy("");
  }

  async function execute() {
    if (!checker) return setMsg("Choose the teacher who will check this test.");
    setBusy("Starting test...");
    const res = await fetch(`/api/online-tests/${runFor.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "execute", checkerTeacher: checker }) });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return setMsg(data.error || "Could not start the test.");
    setMsg(`Test started. Notification sent to ${data.notified} parent device(s).`);
    setRunFor(null);
    setChecker("");
    load();
  }

  async function remove(t) {
    if (!confirm(`Delete "${t.title}" and all its answers? This cannot be undone.`)) return;
    await fetch(`/api/online-tests/${t.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) });
    load();
  }

  return (
    <AdminShell title="Online Tests">
      <div style={{ maxWidth: 820 }}>
        <button onClick={() => setShowForm((v) => !v)} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 16 }}>
          {showForm ? "Close" : "+ New test"}
        </button>
        {msg && <p style={{ fontSize: 13, color: msg.startsWith("Test") ? "#27500A" : COLORS.red, margin: "0 0 12px" }}>{msg}</p>}
        {busy && <p style={{ fontSize: 13, color: COLORS.navy, margin: "0 0 12px" }}>{busy}</p>}

        {showForm && (
          <form onSubmit={createTest} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 18, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Test title</label>
              <input style={input} value={f.title} onChange={set("title")} placeholder="e.g. Physics Unit Test 3" />
            </div>
            <div>
              <label style={label}>Test type</label>
              <select style={input} value={f.type} onChange={set("type")}>
                {TEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Class</label>
              <select style={input} value={f.className} onChange={set("className")}>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
              </select>
            </div>
            <div>
              <label style={label}>Subject</label>
              <input style={input} value={f.subject} onChange={set("subject")} placeholder="e.g. Physics" />
            </div>
            <div>
              <label style={label}>Duration (minutes)</label>
              <input style={input} type="number" min="1" value={f.durationMin} onChange={set("durationMin")} />
            </div>
            <div>
              <label style={label}>Number of MCQs</label>
              <input style={input} type="number" min="0" value={f.mcqCount} onChange={set("mcqCount")} />
            </div>
            <div>
              <label style={label}>Short questions</label>
              <input style={input} type="number" min="0" value={f.shortCount} onChange={set("shortCount")} />
            </div>
            <div>
              <label style={label}>Long questions</label>
              <input style={input} type="number" min="0" value={f.longCount} onChange={set("longCount")} />
            </div>
            <div>
              <label style={label}>Marks per MCQ</label>
              <input style={input} type="number" min="0" value={f.marksMcq} onChange={set("marksMcq")} />
            </div>
            <div>
              <label style={label}>Marks per short question</label>
              <input style={input} type="number" min="0" value={f.marksShort} onChange={set("marksShort")} />
            </div>
            <div>
              <label style={label}>Marks per long question</label>
              <input style={input} type="number" min="0" value={f.marksLong} onChange={set("marksLong")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>MCQ answer key (optional — MCQs will be marked automatically). One letter per MCQ, e.g. ABCDDABC</label>
              <input style={input} value={f.answerKey} onChange={set("answerKey")} placeholder="ABCD..." />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Test paper (PDF) — students will see it exactly as it is</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" accept="application/pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setDetected(null); setDetectMsg(""); }} />
                <button type="button" onClick={autoDetect} disabled={!file || detecting}
                  style={{ background: "#fff", border: `1px solid ${COLORS.navy}`, color: COLORS.navy, borderRadius: 5, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", opacity: !file || detecting ? 0.5 : 1 }}>
                  {detecting ? "Reading paper..." : "Auto-detect MCQ / Short / Long from PDF"}
                </button>
              </div>
              {detectMsg && <p style={{ fontSize: 12, color: detected && !detected.warning ? "#27500A" : "#8A5B00", margin: "6px 0 0" }}>{detectMsg}</p>}
              {detected && detected.questions?.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, color: COLORS.navy, cursor: "pointer" }}>Show detected question-by-question breakdown ({detected.questions.length})</summary>
                  <div style={{ maxHeight: 180, overflow: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 5, marginTop: 6 }}>
                    {detected.questions.map((q) => (
                      <div key={q.number} style={{ display: "grid", gridTemplateColumns: "36px 70px 1fr", gap: 8, padding: "5px 10px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11.5 }}>
                        <span>Q{q.number}</span>
                        <span style={{ textTransform: "capitalize", fontWeight: 600, color: q.type === "mcq" ? "#16215E" : q.type === "long" ? "#C8102E" : "#8A5B00" }}>{q.type}{q.marks ? ` (${q.marks})` : ""}</span>
                        <span style={{ color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.text}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" disabled={!!busy} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "10px 22px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                Save test
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tests.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>No tests yet.</p>}
          {tests.map((t) => {
            const ph = PHASE[t.phase] || PHASE.draft;
            return (
              <div key={t.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{t.title}</p>
                    <p style={{ fontSize: 12, color: "#9A9A90", margin: "2px 0 0" }}>
                      {testTypeLabel(t.type)} · Class {t.className}{t.subject ? ` · ${t.subject}` : ""} · {t.durationMin} min
                      {t.checkerName ? ` · Checker: ${t.checkerName}` : ""}
                    </p>
                    {t.status !== "draft" && (
                      <p style={{ fontSize: 12, color: COLORS.muted, margin: "2px 0 0" }}>Enrolled: {t.enrolled} · Checked: {t.checked}</p>
                    )}
                  </div>
                  <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color: ph.color, background: ph.bg, padding: "4px 10px", borderRadius: 4 }}>{ph.text}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {t.status === "draft" && (
                    <button onClick={() => { setRunFor(t); setMsg(""); }} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "7px 14px", fontSize: 12.5, cursor: "pointer" }}>Execute test</button>
                  )}
                  {t.status !== "draft" && (
                    <a href={`/admin/dashboard/online-tests/${t.id}`} style={{ background: COLORS.navy, color: "#fff", borderRadius: 5, padding: "7px 14px", fontSize: 12.5, textDecoration: "none" }}>
                      {t.phase === "live" ? "Live monitor" : "Results & cheating report"}
                    </a>
                  )}
                  <a href={`/api/online-tests/${t.id}/answer-sheet`} target="_blank" rel="noreferrer"
                    style={{ background: "#fff", border: `1px solid ${COLORS.navy}`, color: COLORS.navy, borderRadius: 5, padding: "7px 14px", fontSize: 12.5, textDecoration: "none" }}>
                    Answer Sheet (PDF)
                  </a>
                  <button onClick={() => remove(t)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", color: COLORS.red }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>

        {runFor && (
          <div onClick={() => setRunFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420 }}>
              <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 17, color: COLORS.navy, margin: "0 0 6px" }}>Execute “{runFor.title}”</p>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 14px" }}>
                The test starts <strong>right now</strong> and runs for {runFor.durationMin} minutes. All Class {runFor.className} parents get a notification. Children who join late get only the time that is left.
              </p>
              <label style={label}>Which teacher will check this test?</label>
              <select style={{ ...input, marginBottom: 14 }} value={checker} onChange={(e) => setChecker(e.target.value)}>
                <option value="">Choose a teacher...</option>
                {teachers.map((t) => <option key={t.username} value={t.username}>{t.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={execute} disabled={!!busy} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Start now</button>
                <button onClick={() => setRunFor(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "10px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
