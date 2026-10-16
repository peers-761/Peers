"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, formatDateTime } from "../../../../lib/theme";
import { pktDateStr } from "../../../../lib/time";

function todayStr() {
  return pktDateStr();
}

export default function TeacherAttendancePage() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/teacher-attendance-report?from=${from}&to=${to}`, { cache: "no-store" });
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell title="Teacher Attendance">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #DBD8CC", borderRadius: 5 }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #DBD8CC", borderRadius: 5 }} />
        </div>
        <button
          onClick={load}
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, cursor: "pointer" }}
        >
          Apply
        </button>
        {data && (
          <span style={{ fontSize: 12.5, color: COLORS.muted, marginBottom: 8 }}>
            {data.workingDays} working day(s) in this range (Sundays/holidays excluded)
          </span>
        )}
      </div>

      {loading || !data ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.tint, textAlign: "left" }}>
                <th style={{ padding: "10px 14px" }}>Teacher</th>
                <th style={{ padding: "10px 14px" }}>Today</th>
                <th style={{ padding: "10px 14px" }}>Present / Working days</th>
                <th style={{ padding: "10px 14px" }}>Average %</th>
                <th style={{ padding: "10px 14px" }}></th>
              </tr>
            </thead>
            <tbody>
              {data.teachers.map((t) => (
                <>
                  <tr key={t.username} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {t.todayMarked ? (
                        <span style={{ color: "#1D7A3B" }}>{formatDateTime(t.todayTime)}</span>
                      ) : (
                        <span style={{ color: COLORS.red }}>Not marked</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{t.presentDays} / {t.workingDays}</td>
                    <td style={{ padding: "10px 14px" }}>{t.percentage === null ? "—" : `${t.percentage}%`}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <button
                        onClick={() => setExpanded(expanded === t.username ? null : t.username)}
                        style={{ background: "none", border: "none", color: COLORS.navy, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" }}
                      >
                        {expanded === t.username ? "Hide record" : "View record"}
                      </button>
                    </td>
                  </tr>
                  {expanded === t.username && (
                    <tr>
                      <td colSpan={5} style={{ padding: "0 14px 14px", background: COLORS.tint }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 8 }}>
                          <thead>
                            <tr style={{ textAlign: "left" }}>
                              <th style={{ padding: "6px 8px" }}>Date</th>
                              <th style={{ padding: "6px 8px" }}>Status</th>
                              <th style={{ padding: "6px 8px" }}>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.history.slice().reverse().map((h) => (
                              <tr key={h.date} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td style={{ padding: "6px 8px" }}>{h.date}</td>
                                <td style={{ padding: "6px 8px", color: h.present ? "#1D7A3B" : COLORS.red }}>
                                  {h.present ? "Present" : "Absent"}
                                </td>
                                <td style={{ padding: "6px 8px" }}>{h.present ? formatDateTime(h.time) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
