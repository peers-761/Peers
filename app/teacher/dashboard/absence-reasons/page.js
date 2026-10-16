"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../../../../lib/theme";

export default function AbsenceReasonsPage() {
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/absence-remarks", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRemarks(d);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Absence Reasons
        </p>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : remarks.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>No absence reasons submitted yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {remarks.map((r) => (
              <div key={r.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{r.studentName}</p>
                  <span style={{ fontSize: 12, color: "#9A9A90" }}>{r.date}</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.ink, margin: "0 0 4px" }}>
                  <strong>Reason:</strong> {r.reason}
                </p>
                {r.remarks && (
                  <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 4px" }}>{r.remarks}</p>
                )}
                {r.proofImage && (
                  <img
                    src={`/api/image?key=${r.proofImage}`}
                    alt="Proof"
                    style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 5, marginTop: 6 }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
