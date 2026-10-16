"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../../../../lib/theme";
import { testTypeLabel } from "../../../../lib/onlineTestShared";

function dateLabel(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

export default function ParentOnlineTestsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/online-tests/parent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load. Check your internet and try again."));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Online Test Results</p>
        <a href="/parent/dashboard" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>Back</a>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 18px" }}>
        {error && <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>}
        {!data && !error && <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>}

        {data && data.annual && (
          <div style={{ background: COLORS.navy, borderRadius: 10, padding: "16px 18px", marginBottom: 18, color: "#fff" }}>
            <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 15, margin: "0 0 8px" }}>Annual Report</p>
            <p style={{ fontSize: 13, margin: "0 0 8px", opacity: 0.9 }}>
              {data.annual.testsChecked} of {data.annual.testsTaken} tests checked · Overall average: <strong>{data.annual.averagePercentage}%</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.annual.bySubject.map((s) => (
                <span key={s.subject} style={{ fontSize: 12, background: "rgba(255,255,255,0.12)", padding: "5px 10px", borderRadius: 5 }}>
                  {s.subject}: {s.average}% ({s.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {data && data.results.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>No test results yet.</p>}

        {data && data.results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.results.map((r) => (
              <a
                key={r.id}
                href={`/parent/dashboard/online-tests/${r.id}`}
                style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "13px 16px", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{r.title}</p>
                  <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "2px 0 0" }}>
                    {testTypeLabel(r.type)}{r.subject ? ` · ${r.subject}` : ""} · {dateLabel(r.date)}
                  </p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.navy, margin: 0 }}>
                  {r.result ? `${r.result.obtained}/${r.result.outOf} · ${r.result.grade}` : "Not checked yet"}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
