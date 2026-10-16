"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COLORS } from "../../../../../lib/theme";

function dateLabel(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

const cell = { padding: "7px 10px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 };

export default function ParentOnlineTestReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/online-tests/parent/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Could not load. Check your internet and try again."));
  }, [id]);

  const header = (
    <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Test Report</p>
      <a href="/parent/dashboard/online-tests" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>Back</a>
    </div>
  );

  if (error) return <div>{header}<p style={{ padding: 24, fontSize: 13, color: COLORS.red }}>{error}</p></div>;
  if (!data) return <div>{header}<p style={{ padding: 24, fontSize: 13, color: COLORS.muted }}>Loading...</p></div>;

  const { test, answers, marks, result, comment, checked, autoMcq } = data;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      {header}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 18px" }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 2px" }}>{test.title}</p>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 16px" }}>{test.subject ? `${test.subject} · ` : ""}{dateLabel(test.startedAt)}</p>

        {!checked ? (
          <p style={{ fontSize: 13.5, color: "#8A5B00" }}>This paper has not been checked yet.</p>
        ) : (
          <div style={{ background: COLORS.navy, color: "#fff", borderRadius: 8, padding: "14px 18px", marginBottom: 18 }}>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{result.obtained} / {result.outOf}</p>
            <p style={{ fontSize: 13, opacity: 0.9, margin: "2px 0 0" }}>{result.percentage}% · Grade {result.grade}</p>
          </div>
        )}

        {test.mcqCount > 0 && (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 8px" }}>MCQs</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Array.from({ length: test.mcqCount }, (_, i) => i + 1).map((n) => {
                const given = answers?.mcq?.[n];
                const right = test.answerKey?.[n];
                const ok = right ? given === right : null;
                return (
                  <span key={n} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, background: ok === null ? "#EEEDE6" : ok ? "#EAF3DE" : "#FCEBEB", color: ok === null ? COLORS.ink : ok ? "#27500A" : "#791F1F" }}>
                    {n}: {given || "–"}
                  </span>
                );
              })}
            </div>
            {autoMcq !== null && checked && <p style={{ fontSize: 12, color: COLORS.muted, margin: "8px 0 0" }}>MCQ marks: {autoMcq}</p>}
          </div>
        )}

        {[["S", test.shortCount, "Short question", test.marksShort], ["L", test.longCount, "Long question", test.marksLong]].map(([p, count, name, max]) =>
          Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <div key={p + n} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>{name} {n}</span>
                {checked && <span style={{ fontSize: 12.5, color: COLORS.ink }}>{marks[p + n] ?? 0} / {max}</span>}
              </div>
              <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0, color: answers?.text?.[p + n] ? COLORS.ink : "#9A9A90" }}>{answers?.text?.[p + n] || "No answer written"}</p>
            </div>
          ))
        )}

        {comment && (
          <div style={{ background: "#FCEFD6", borderRadius: 8, padding: "12px 14px", marginTop: 6 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#8A5B00", margin: "0 0 2px" }}>Teacher's comment</p>
            <p style={{ fontSize: 13, color: "#5A4A20", margin: 0 }}>{comment}</p>
          </div>
        )}
      </div>
    </div>
  );
}
