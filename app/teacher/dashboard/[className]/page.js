"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { COLORS } from "../../../../lib/theme";
import { pktDateStr } from "../../../../lib/time";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "#27500A", bg: "#EAF3DE" },
  { value: "absent", label: "Absent", color: "#791F1F", bg: "#FCEBEB" },
  { value: "leave", label: "Leave", color: "#8A5B00", bg: "#FCEFD6" },
];

function today() {
  return pktDateStr();
}

function draftKey(className, date) {
  return `attendance-draft:${className}:${date}`;
}

export default function ClassAttendancePage() {
  const { className } = useParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [sectionFilter, setSectionFilter] = useState("Boys");
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [newDayAvailable, setNewDayAvailable] = useState(false);
  const loadedDateWasAutoToday = useRef(true);

  // "Add student" form (teachers can add, only the admin can remove)
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFather, setNewFather] = useState("");
  const [newRoll, setNewRoll] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState("");
  const [addedInfo, setAddedInfo] = useState(null);
  const [adding, setAdding] = useState(false);

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!newName.trim() || adding) return;
    setAdding(true);
    setAddError("");
    setAddedInfo(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className,
          name: newName,
          fatherName: newFather,
          rollNo: newRoll,
          parentPhone: newPhone,
          section: sectionFilter,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error || "Could not add student. Please try again.");
      } else {
        setAddedInfo(data);
        setNewName("");
        setNewFather("");
        setNewRoll("");
        setNewPhone("");
        const all = await fetch("/api/students", { cache: "no-store" }).then((r) => r.json());
        setStudents(all[className] || []);
      }
    } catch {
      setAddError("Could not reach the server. Check your internet and try again.");
    }
    setAdding(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [studentsRes, attendanceRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/attendance?class=${className}&date=${date}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setStudents(studentsRes[className] || []);

      // If this device has unsaved marks for this exact class+date sitting
      // in a local draft (e.g. the teacher tapped "View report" on a
      // student, or the app got closed before hitting Save), restore them
      // on top of whatever the server already has saved.
      let merged = attendanceRes || {};
      try {
        const draftRaw = localStorage.getItem(draftKey(className, date));
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && Object.keys(draft).length > 0) {
            merged = { ...merged, ...draft };
            setRestoredDraft(true);
          }
        }
      } catch {
        // ignore corrupt/unavailable localStorage
      }

      setMarks(merged);
      setLoading(false);
      setSaved(false);
    }
    load();
  }, [className, date]);

  // Fun little safeguard: if this tab is left open overnight, quietly check
  // every minute whether the real-world date has moved on from the date this
  // page loaded with, and offer a one-tap jump to today instead of silently
  // leaving the teacher marking yesterday's page.
  useEffect(() => {
    const interval = setInterval(() => {
      const realToday = today();
      if (loadedDateWasAutoToday.current && date !== realToday) {
        setNewDayAvailable(true);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [date]);

  function jumpToToday() {
    const realToday = today();
    loadedDateWasAutoToday.current = true;
    setNewDayAvailable(false);
    setDate(realToday);
  }

  function setMark(studentId, status) {
    setMarks((prev) => {
      const next = { ...prev, [studentId]: status };
      try {
        localStorage.setItem(draftKey(className, date), JSON.stringify(next));
      } catch {
        // ignore if localStorage isn't available
      }
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaveError("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className, date, records: marks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Could not save attendance. Please try again — your marks are still kept on this device.");
        return;
      }
    } catch (err) {
      setSaveError("Could not reach the server. Check your internet and try again — your marks are still kept on this device.");
      return;
    }

    // Only clear the local draft and show "Saved" once the server has
    // actually confirmed the save — otherwise a failed save would look
    // identical to a successful one, and the attendance would silently
    // never make it into the database.
    try {
      localStorage.removeItem(draftKey(className, date));
    } catch {
      // ignore
    }
    setRestoredDraft(false);
    setSaved(true);
  }

  function handleDateChange(newDate) {
    loadedDateWasAutoToday.current = newDate === today();
    setNewDayAvailable(false);
    setDate(newDate);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Attendance — {/^\d+$/.test(className) ? `Class ${className}` : className}
        </p>
        <a
          href="/teacher/dashboard"
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, textDecoration: "none" }}
        >
          Change class
        </a>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {newDayAvailable && (
          <div
            style={{
              background: "#FCEFD6",
              border: "1px solid #F0C97A",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p style={{ fontSize: 13, color: "#8A5B00", margin: 0 }}>
              🌅 A new day has started — you're still viewing {date}.
            </p>
            <button
              onClick={jumpToToday}
              style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "7px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
            >
              Jump to today
            </button>
          </div>
        )}

        {restoredDraft && (
          <div
            style={{
              background: "#EAF3DE",
              border: "1px solid #C0DD97",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 18,
            }}
          >
            <p style={{ fontSize: 12.5, color: "#27500A", margin: 0 }}>
              ✓ Unsaved marks from your last visit were restored — don't forget to hit Save.
            </p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: COLORS.muted }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 13, border: `1px solid #DBD8CC`, borderRadius: 5 }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#9A9A90", margin: "0 0 20px" }}>
          Picking a past date loads what was already marked — change it and save again to correct a mistake.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["Boys", "Girls"].map((s) => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              style={{
                padding: "7px 16px",
                fontSize: 13,
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

        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setShowAdd((v) => !v)}
            style={{ background: "#fff", color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: 5, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            {showAdd ? "Close" : `+ Add ${sectionFilter === "Girls" ? "girl" : "boy"} student`}
          </button>

          {showAdd && (
            <form
              onSubmit={handleAddStudent}
              style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 16, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}
            >
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>
                New student will be added to {/^\d+$/.test(className) ? `Class ${className}` : className} ({sectionFilter}).
              </p>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Student name *" style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
              <input value={newFather} onChange={(e) => setNewFather(e.target.value)} placeholder="Father's name" style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
              <input value={newRoll} onChange={(e) => setNewRoll(e.target.value)} placeholder="Roll No (parent signs in with this)" style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Parent phone number" inputMode="tel" style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
              <button
                type="submit"
                disabled={adding}
                style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" }}
              >
                {adding ? "Adding..." : "Add student"}
              </button>
              {addError && <p style={{ fontSize: 12.5, color: COLORS.red, margin: 0 }}>{addError}</p>}
              {addedInfo && (
                <p style={{ fontSize: 12.5, color: "#27500A", margin: 0 }}>
                  ✓ {addedInfo.name} added. Student ID: {addedInfo.id} · Parent PIN: {addedInfo.parentPassword}
                </p>
              )}
            </form>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading students...</p>
        ) : students.filter((s) => (s.section || "Boys") === sectionFilter).length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24 }}>
            <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>
              No {sectionFilter.toLowerCase()} students added for this class yet. Use the “Add student” button above.
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
              {students
                .filter((s) => (s.section || "Boys") === sectionFilter)
                .map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "14px 18px",
                    borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 160 }}>
                    <p style={{ fontSize: 14, color: COLORS.ink, margin: 0, fontWeight: 500 }}>{s.name}</p>
                    <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>{s.id} · PIN: {s.parentPassword || "—"}</p>
                    <a
                      href={`/teacher/dashboard/${className}/report/${s.id}`}
                      target="_blank"
                      style={{ color: COLORS.red, fontSize: 11.5, marginTop: 2, display: "inline-block", textDecoration: "none" }}
                    >
                      View report
                    </a>
                    {" · "}
                    <a
                      href={`/teacher/dashboard/${className}/result/${s.id}`}
                      target="_blank"
                      style={{ color: COLORS.navy, fontSize: 11.5, display: "inline-block", textDecoration: "none" }}
                    >
                      Enter result
                    </a>
                    {" · "}
                    <a
                      href={`/teacher/dashboard/${className}/remarks/${s.id}`}
                      target="_blank"
                      style={{ color: "#8A5B00", fontSize: 11.5, display: "inline-block", textDecoration: "none" }}
                    >
                      Remarks
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = marks[s.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setMark(s.id, opt.value)}
                          style={{
                            fontSize: 12.5,
                            fontWeight: 500,
                            padding: "6px 12px",
                            borderRadius: 5,
                            border: active ? `1px solid ${opt.color}` : `1px solid ${COLORS.border}`,
                            background: active ? opt.bg : "#fff",
                            color: active ? opt.color : COLORS.muted,
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              style={{
                marginTop: 20,
                background: COLORS.red,
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save attendance
            </button>
            {saved && <p style={{ fontSize: 12.5, color: "#27500A", marginTop: 10 }}>Attendance saved for {date}.</p>}
            {saveError && <p style={{ fontSize: 12.5, color: COLORS.red, marginTop: 10 }}>{saveError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
