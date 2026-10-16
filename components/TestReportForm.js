"use client";

import { useMemo, useState } from "react";
import { COLORS } from "../lib/theme";
import { computeReport, gradeColor } from "../lib/testResultCalc";

const DEFAULT_SUBJECTS = [
  { name: "Physics", obtained: "", total: "100" },
  { name: "Chemistry", obtained: "", total: "100" },
  { name: "Biology", obtained: "", total: "100" },
  { name: "Mathematics", obtained: "", total: "100" },
  { name: "English", obtained: "", total: "100" },
  { name: "Urdu", obtained: "", total: "100" },
];

const input = { padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, width: "100%", boxSizing: "border-box" };
const label = { display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 };

// Renders the "who prepares it" label for the confirmation screen.
function roleLabel(role) {
  if (role === "incharge") return "Class Incharge";
  if (role === "teacher") return "Teacher";
  return "Admin";
}

export default function TestReportForm({ className, studentId, studentName, preparedByRole, backHref, backLabel = "Back" }) {
  const [testName, setTestName] = useState("");
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [whatWasTheTest, setWhatWasTheTest] = useState("");
  const [marksNote, setMarksNote] = useState("");
  const [whatIsTheIssue, setWhatIsTheIssue] = useState("");
  const [howToImprove, setHowToImprove] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [saved, setSaved] = useState(null); // { pushed }

  function updateSubject(index, field, value) {
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function addSubjectRow() {
    setSubjects((prev) => [...prev, { name: "", obtained: "", total: "100" }]);
  }
  function removeSubjectRow(index) {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  }

  const subjectsObj = useMemo(() => {
    const obj = {};
    for (const s of subjects) {
      if (s.name.trim() && s.obtained !== "") obj[s.name.trim()] = { obtained: Number(s.obtained) || 0, total: Number(s.total) || 0 };
    }
    return obj;
  }, [subjects]);

  const preview = useMemo(() => computeReport(subjectsObj), [subjectsObj]);
  const hasData = Object.keys(subjectsObj).length > 0;

  async function save(publish) {
    if (Object.keys(subjectsObj).length === 0) {
      setError("Enter a subject name and marks for at least one subject.");
      return;
    }
    setError("");
    setSaving(publish ? "push" : "draft");
    try {
      const res = await fetch("/api/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId, className, testName, subjects: subjectsObj,
          whatWasTheTest, marksNote, whatIsTheIssue, howToImprove, publish,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save result.");
      setSaved({ pushed: publish });
    } catch (err) {
      setError(err.message || "Could not save result.");
    }
    setSaving("");
  }

  function resetForm() {
    setSaved(null);
    setSubjects(DEFAULT_SUBJECTS);
    setTestName("");
    setWhatWasTheTest("");
    setMarksNote("");
    setWhatIsTheIssue("");
    setHowToImprove("");
  }

  if (saved) {
    return (
      <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "20px 22px" }}>
        <p style={{ fontSize: 14, color: "#27500A", margin: "0 0 12px" }}>
          {saved.pushed ? "✓ Report saved and pushed to the Parent Portal." : "✓ Report saved as a draft. It will only reach the parent once you push it."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={resetForm} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>
            Enter another report
          </button>
          {backHref && (
            <a href={backHref} style={{ background: "#fff", color: COLORS.navy, border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "9px 16px", fontSize: 13, textDecoration: "none" }}>
              {backLabel}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {studentName && (
        <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 14px" }}>
          Preparing report for <strong style={{ color: COLORS.ink }}>{studentName}</strong>
          {preparedByRole ? <> — prepared by <strong>{roleLabel(preparedByRole)}</strong></> : null}
        </p>
      )}

      <label style={label}>Test name</label>
      <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. September Monthly Test"
        style={{ ...input, marginBottom: 20 }} />

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 30px", background: COLORS.tint, padding: "10px 16px" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Subject</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Obtained</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Total</span>
          <span />
        </div>
        {subjects.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 30px", alignItems: "center", padding: "8px 16px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            <input value={s.name} onChange={(e) => updateSubject(i, "name", e.target.value)} placeholder="Subject name"
              style={{ width: "90%", padding: "6px 8px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 4 }} />
            <input type="number" value={s.obtained} onChange={(e) => updateSubject(i, "obtained", e.target.value)}
              style={{ width: "80%", padding: "6px 8px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 4 }} />
            <input type="number" value={s.total} onChange={(e) => updateSubject(i, "total", e.target.value)}
              style={{ width: "80%", padding: "6px 8px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 4 }} />
            <button onClick={() => removeSubjectRow(i)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      <button onClick={addSubjectRow} style={{ background: "none", border: `1px dashed ${COLORS.border}`, color: COLORS.navy, borderRadius: 5, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", marginBottom: 20 }}>
        + Add subject
      </button>

      {/* Auto-filled summary — updates live as marks are typed */}
      <div style={{ background: COLORS.tint, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600, color: COLORS.navy }}>Auto-calculated</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 10 }}>
          <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Total obtained</p><p style={{ margin: 0, fontWeight: 700, color: COLORS.navy }}>{preview.totalObtained}/{preview.totalOutOf}</p></div>
          <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Average / subject</p><p style={{ margin: 0, fontWeight: 700, color: COLORS.navy }}>{preview.average}</p></div>
          <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Percentage</p><p style={{ margin: 0, fontWeight: 700, color: COLORS.navy }}>{preview.percentage}%</p></div>
          <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Grade</p><p style={{ margin: 0, fontWeight: 700, color: gradeColor(preview.grade) }}>{preview.grade}</p></div>
        </div>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: COLORS.muted }}>Result bar</p>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${hasData ? preview.resultBar : 0}%`, height: "100%", background: gradeColor(preview.grade), transition: "width 0.2s" }} />
        </div>
      </div>

      <label style={label}>Which test was this?</label>
      <input value={whatWasTheTest} onChange={(e) => setWhatWasTheTest(e.target.value)} style={{ ...input, marginBottom: 14 }} />

      <label style={label}>Notes on marks</label>
      <input value={marksNote} onChange={(e) => setMarksNote(e.target.value)} style={{ ...input, marginBottom: 14 }} />

      <label style={label}>What is the issue?</label>
      <input value={whatIsTheIssue} onChange={(e) => setWhatIsTheIssue(e.target.value)} style={{ ...input, marginBottom: 14 }} />

      <label style={label}>How can it be corrected?</label>
      <input value={howToImprove} onChange={(e) => setHowToImprove(e.target.value)} style={{ ...input, marginBottom: 20 }} />

      {error && <p style={{ fontSize: 12.5, color: COLORS.red, margin: "0 0 14px" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => save(false)} disabled={!!saving}
          style={{ background: "#fff", color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: 6, padding: "12px 22px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving === "draft" ? "Saving..." : "Save as draft"}
        </button>
        <button onClick={() => save(true)} disabled={!!saving}
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "12px 22px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving === "push" ? "Pushing..." : "Save & push to Parent Portal"}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "10px 0 0" }}>
        A draft is only visible to staff. Pushing sends it to the Parent Portal, where it stays for 30 days before it is automatically removed — your own copy is never deleted by that.
      </p>
    </div>
  );
}
