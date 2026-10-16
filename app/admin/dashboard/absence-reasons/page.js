"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function AdminAbsenceReasonsPage() {
  const [data, setData] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/todays-absentees", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/absence-remarks", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([absRes, remRes]) => {
      setData(absRes);
      setRemarks(remRes);
      setLoading(false);
    });
  }, []);

  return (
    <AdminShell title="Absence Reasons">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px" }}>
        Today's absentees, and reasons submitted by parents or noted by the incharge.
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
      ) : (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>
            Today's Absentees ({data.absentees.length})
          </p>
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 28 }}>
            {data.absentees.map((a, i) => (
              <div key={a.studentId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{a.studentName}</p>
                  <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>{a.className} · {a.parentPhone}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: a.reasonSubmitted ? "#27500A" : "#791F1F", background: a.reasonSubmitted ? "#EAF3DE" : "#FCEBEB", padding: "4px 10px", borderRadius: 4 }}>
                  {a.reasonSubmitted ? "Reason submitted" : "No reason yet"}
                </span>
              </div>
            ))}
            {data.absentees.length === 0 && <p style={{ padding: 16, fontSize: 13, color: COLORS.muted, margin: 0 }}>No absentees today.</p>}
          </div>

          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>All Absence Reasons</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {remarks.map((r) => (
              <div key={r.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{r.studentName}</p>
                  <span style={{ fontSize: 11.5, color: "#9A9A90" }}>{r.date}</span>
                </div>
                <p style={{ fontSize: 12.5, color: COLORS.ink, margin: 0 }}>{r.reason}{r.remarks ? ` — ${r.remarks}` : ""}</p>
              </div>
            ))}
            {remarks.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>None submitted yet.</p>}
          </div>
        </>
      )}
    </AdminShell>
  );
}
