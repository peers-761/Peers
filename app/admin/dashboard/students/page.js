"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, CLASSES } from "../../../../lib/theme";

export default function StudentsAdminPage() {
  const [selectedClass, setSelectedClass] = useState("Pre 1");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [students, setStudents] = useState({});
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [section, setSection] = useState("Boys");
  const [error, setError] = useState("");
  const [promoteConfirming, setPromoteConfirming] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);

  async function load() {
    const res = await fetch("/api/students", { cache: "no-store" });
    setStudents(await res.json());
  }

  async function handlePromote() {
    setPromoting(true);
    setPromoteResult(null);
    const res = await fetch("/api/promote-students", { method: "POST" });
    const data = await res.json();
    setPromoting(false);
    setPromoteConfirming(false);
    if (!res.ok) {
      setPromoteResult({ error: data.error || "Could not promote students." });
      return;
    }
    setPromoteResult(data);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  // School-wide search (every class at once), as the admin types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin-student?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const classLabel = (c) => (/^\d+$/.test(c) ? `Class ${c}` : c);
  const profileUrl = (s, cls, isNew) => `/admin/dashboard/students/${encodeURIComponent(s.id)}?class=${encodeURIComponent(cls)}${isNew ? "&new=1" : ""}`;

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className: selectedClass, name, id: studentId, section, parentPhone, fatherName, rollNo }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add student.");
      return;
    }
    const created = await res.json();
    setError("");
    setName("");
    setFatherName("");
    setRollNo("");
    setStudentId("");
    setParentPhone("");
    // Open the new student's page right at the fee voucher so the fee is entered now.
    window.location.href = profileUrl(created, selectedClass, true);
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remove ${name}? This deletes their attendance history, fee vouchers, receipts, remarks and test records permanently — this cannot be undone.`)) return;
    await fetch("/api/students", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className: selectedClass, id }),
    });
    load();
  }

  const fullList = students[selectedClass] || [];
  const list = sectionFilter === "All" ? fullList : fullList.filter((s) => (s.section || "Boys") === sectionFilter);

  return (
    <AdminShell title="Students">
      <div style={{ background: "#FCEFD6", border: "1px solid #E8CE8F", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#5A4300", margin: "0 0 4px" }}>Promote All Students</p>
        <p style={{ fontSize: 12, color: "#7A6220", margin: "0 0 10px" }}>
          Once a year, after the Annual Result is announced: moves every student up one class (Pre 1 → Pre 2 → ... → 10).
          Class 10 students graduate out. New admissions and students who've left are still added/removed by you as usual.
        </p>
        {!promoteConfirming ? (
          <button
            onClick={() => setPromoteConfirming(true)}
            style={{ background: "#5A4300", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
          >
            Promote All Students →
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#791F1F", margin: "0 0 10px" }}>
              Are you sure? This moves every student to the next class right now — do this only once, right after results are announced.
            </p>
            <button
              onClick={handlePromote}
              disabled={promoting}
              style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginRight: 8 }}
            >
              {promoting ? "Promoting..." : "Yes, promote everyone"}
            </button>
            <button
              onClick={() => setPromoteConfirming(false)}
              style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "8px 16px", fontSize: 12.5, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        )}
        {promoteResult && (
          <p style={{ fontSize: 12.5, marginTop: 10, color: promoteResult.error ? COLORS.red : "#27500A" }}>
            {promoteResult.error || `Done — ${promoteResult.promotedCount} student(s) promoted, ${promoteResult.graduatedCount} graduated from Class 10.`}
          </p>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 8px" }}>Search any student (all classes)</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a name, father's name or roll number..."
          style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        {results && (
          <div style={{ marginTop: 10 }}>
            {results.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>No student found.</p>}
            {results.map((s) => (
              <a
                key={s.className + s.id}
                href={profileUrl(s, s.className)}
                style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 4px", borderTop: `1px solid ${COLORS.border}`, textDecoration: "none", color: COLORS.ink, fontSize: 13.5 }}
              >
                <span>
                  {s.name} <span style={{ color: COLORS.muted, fontSize: 12 }}>s/o {s.fatherName || "—"} · {s.id}</span>
                </span>
                <span style={{ fontWeight: 600, color: COLORS.navy, whiteSpace: "nowrap" }}>{classLabel(s.className)} · {s.section}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedClass(c)}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 5,
              border: `1px solid ${selectedClass === c ? COLORS.navy : COLORS.border}`,
              background: selectedClass === c ? COLORS.navy : "#fff",
              color: selectedClass === c ? "#fff" : COLORS.ink,
              cursor: "pointer",
            }}
          >
            {/^\d+$/.test(c) ? `Class ${c}` : c}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Student name"
          style={{ flex: 1, minWidth: 160, maxWidth: 220, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        <input
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          placeholder="Father's name"
          style={{ flex: 1, minWidth: 160, maxWidth: 220, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        <input
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          placeholder="Roll No (= login ID)"
          style={{ flex: 1, minWidth: 110, maxWidth: 130, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Different login ID (optional)"
          style={{ flex: 1, minWidth: 170, maxWidth: 200, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        <input
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          placeholder="Parent phone number"
          style={{ flex: 1, minWidth: 160, maxWidth: 190, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: COLORS.ink }}>
            <input type="radio" name="new-student-section" checked={section === "Boys"} onChange={() => setSection("Boys")} />
            Boys
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: COLORS.ink }}>
            <input type="radio" name="new-student-section" checked={section === "Girls"} onChange={() => setSection("Girls")} />
            Girls
          </label>
        </div>
        <button
          type="submit"
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Add student
        </button>
      </form>
      {error && <p style={{ fontSize: 12.5, color: COLORS.red, margin: "0 0 12px" }}>{error}</p>}
      <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "0 0 20px" }}>
        The Roll No is the number the parent uses to sign in (it must be different for every student in the school). Leave both blank to auto-generate one. Parent phone number is used by the Incharge to
        follow up on absences. After you add a student, their page opens so you can enter the fee voucher right away.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["All", "Boys", "Girls"].map((s) => (
          <button
            key={s}
            onClick={() => setSectionFilter(s)}
            style={{
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 5,
              border: `1px solid ${sectionFilter === s ? COLORS.navy : COLORS.border}`,
              background: sectionFilter === s ? COLORS.navy : "#fff",
              color: sectionFilter === s ? "#fff" : COLORS.ink,
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {list.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            <div>
              <p style={{ fontSize: 13.5, color: COLORS.ink, margin: 0 }}>
                <a href={profileUrl(s, selectedClass)} style={{ color: COLORS.navy, textDecoration: "none", fontWeight: 500 }}>{s.name}</a> <span style={{ fontSize: 11, color: "#9A9A90", fontWeight: 400 }}>({s.section || "Boys"})</span>
              </p>
              <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>
                {s.id} · Parent PIN: {s.parentPassword || "—"} · Phone: {s.parentPhone || "—"}
              </p>
            </div>
            <button onClick={() => handleDelete(s.id, s.name)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}>
              Remove
            </button>
          </div>
        ))}
        {list.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No students here yet.</p>}
      </div>
    </AdminShell>
  );
}
