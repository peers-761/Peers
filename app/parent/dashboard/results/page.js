"use client";

import { useEffect, useState } from "react";
import { downloadElementAsPdf, safeFileName } from "../../../../lib/downloadPdf";
import { COLORS } from "../../../../lib/theme";

export default function ParentResultsPage() {
  const [me, setMe] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent-me", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (d) => {
        setMe(d);
        if (d.id) {
          const res = await fetch(`/api/test-results?studentId=${d.id}`, { cache: "no-store" });
          setResults(await res.json());
        }
        setLoading(false);
      });
  }, []);

  function handlePrint() {
    window.print();
  }

  const [downloadingId, setDownloadingId] = useState(null);

  async function handleDownload(r) {
    setDownloadingId(r.id);
    try {
      await downloadElementAsPdf(document.getElementById(`result-${r.id}`), safeFileName(r.testName || "Test-Result", r.studentName));
    } catch (err) {
      alert(err.message || "Could not create the PDF.");
    }
    setDownloadingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .result-card { page-break-after: always; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="no-print" style={{ background: COLORS.navy, padding: "16px 24px" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Test Results</p>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : results.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>No results have been posted yet.</p>
        ) : (
          results.map((r) => (
            <div key={r.id} id={`result-${r.id}`} className="result-card" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
              <div style={{ textAlign: "center", marginBottom: 18, borderBottom: `2px solid ${COLORS.navy}`, paddingBottom: 14 }}>
                <p style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 18, color: COLORS.navy, margin: "0 0 4px" }}>
                  The PEERS Education System
                </p>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>{r.testName}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18, fontSize: 13.5 }}>
                <p style={{ margin: 0 }}><strong>Student Name:</strong> {r.studentName}</p>
                <p style={{ margin: 0 }}><strong>Father Name:</strong> {r.fatherName || "—"}</p>
                <p style={{ margin: 0 }}><strong>Class:</strong> {r.className}</p>
                <p style={{ margin: 0 }}><strong>Roll No:</strong> {r.rollNo}</p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: COLORS.tint }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", border: `1px solid ${COLORS.border}` }}>Subject</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", border: `1px solid ${COLORS.border}` }}>Obtained</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", border: `1px solid ${COLORS.border}` }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(r.subjects).map(([subj, m]) => (
                    <tr key={subj}>
                      <td style={{ padding: "7px 10px", border: `1px solid ${COLORS.border}` }}>{subj}</td>
                      <td style={{ textAlign: "center", padding: "7px 10px", border: `1px solid ${COLORS.border}` }}>{m.obtained}</td>
                      <td style={{ textAlign: "center", padding: "7px 10px", border: `1px solid ${COLORS.border}` }}>{m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10, textAlign: "center" }}>
                <div style={{ background: COLORS.tint, borderRadius: 6, padding: "10px 0" }}>
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Total</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{r.totalObtained ?? r.totalMarks}/{r.totalOutOf}</p>
                </div>
                <div style={{ background: COLORS.tint, borderRadius: 6, padding: "10px 0" }}>
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Average</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{r.average ?? "—"}</p>
                </div>
                <div style={{ background: COLORS.tint, borderRadius: 6, padding: "10px 0" }}>
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Percentage</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{r.percentage}%</p>
                </div>
                <div style={{ background: COLORS.tint, borderRadius: 6, padding: "10px 0" }}>
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Grade</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{r.grade}</p>
                </div>
              </div>
              {typeof r.resultBar === "number" && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ background: COLORS.tint, borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${r.resultBar}%`, height: "100%", background: COLORS.navy }} />
                  </div>
                </div>
              )}

              {(r.whatWasTheTest || r.marksNote || r.whatIsTheIssue || r.howToImprove) && (
                <div style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.7, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
                  {r.whatWasTheTest && <p style={{ margin: "0 0 4px" }}><strong>Test:</strong> {r.whatWasTheTest}</p>}
                  {r.marksNote && <p style={{ margin: "0 0 4px" }}><strong>Notes:</strong> {r.marksNote}</p>}
                  {r.whatIsTheIssue && <p style={{ margin: "0 0 4px" }}><strong>Issue:</strong> {r.whatIsTheIssue}</p>}
                  {r.howToImprove && <p style={{ margin: 0 }}><strong>Correction:</strong> {r.howToImprove}</p>}
                </div>
              )}

              <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => handleDownload(r)} disabled={downloadingId === r.id} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
                  {downloadingId === r.id ? "Preparing PDF..." : "Download PDF"}
                </button>
                <button onClick={handlePrint} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
                  Print
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
