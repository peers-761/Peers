"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, CLASSES } from "../../../../lib/theme";
import { pktDateStr } from "../../../../lib/time";

const STATUS_LABEL = {
  present: { label: "Present", color: "#27500A", bg: "#EAF3DE" },
  absent: { label: "Absent", color: "#791F1F", bg: "#FCEBEB" },
  leave: { label: "Leave", color: "#8A5B00", bg: "#FCEFD6" },
};

function today() {
  return pktDateStr();
}

export default function AttendanceAdminPage() {
  const [className, setClassName] = useState("Pre 1");
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [studentsRes, attendanceRes] = await Promise.all([
      fetch("/api/students", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/attendance?class=${className}&date=${date}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setStudents(studentsRes[className] || []);
    setRecords(attendanceRes || {});
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, date]);

  const markedCount = Object.keys(records).length;

  return (
    <AdminShell title="Attendance records">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        >
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {/^\d+$/.test(c) ? `Class ${c}` : c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
        />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
      ) : students.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24 }}>
          <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>No students in this class yet.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 12px" }}>
            {markedCount} of {students.length} students marked for {date}.
          </p>
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
            {students.map((s, i) => {
              const status = records[s.id];
              const info = status ? STATUS_LABEL[status] : null;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13.5, color: COLORS.ink, margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>{s.id}</p>
                  </div>
                  {info ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: info.color, background: info.bg, padding: "4px 12px", borderRadius: 4 }}>
                      {info.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#9A9A90" }}>Not marked</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminShell>
  );
}
