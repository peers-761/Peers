"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { downloadElementAsPdf, safeFileName } from "../../../../../../lib/downloadPdf";
import { COLORS } from "../../../../../../lib/theme";
import { pktDateStr } from "../../../../../../lib/time";

const STATUS_LABEL = {
  present: { label: "Present", color: "#27500A", bg: "#EAF3DE" },
  absent: { label: "Absent", color: "#791F1F", bg: "#FCEBEB" },
  leave: { label: "Leave", color: "#8A5B00", bg: "#FCEFD6" },
};

// Always Pakistan's calendar date — not the device's own timezone — so
// this matches every other date shown across the site.
function toISODate(d) {
  return pktDateStr(d);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export default function StudentReportPage() {
  const { className, studentId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(daysAgo(29));
  const [toDate, setToDate] = useState(toISODate(new Date()));

  useEffect(() => {
    fetch(`/api/attendance-history?class=${className}&studentId=${studentId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [className, studentId]);

  const [downloading, setDownloading] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadElementAsPdf(document.getElementById("pdf-area"), safeFileName("Attendance", data?.name || "student"));
    } catch (err) {
      alert(err.message || "Could not create the PDF.");
    }
    setDownloading(false);
  }

  function setPreset(days) {
    setFromDate(daysAgo(days - 1));
    setToDate(toISODate(new Date()));
  }

  const history = data?.history || [];
  // Only dates that were actually marked appear here — holidays and
  // unmarked days simply don't exist in this list, so they can't drag
  // the average down.
  const rangeHistory = history.filter((h) => h.date >= fromDate && h.date <= toDate);
  const presentCount = rangeHistory.filter((a) => a.status === "present").length;
  const absentCount = rangeHistory.filter((a) => a.status === "absent").length;
  const leaveCount = rangeHistory.filter((a) => a.status === "leave").length;
  const totalMarked = rangeHistory.length;
  const average = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : null;

  return (
    <div id="pdf-area" style={{ minHeight: "100vh", background: COLORS.tint }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print" style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Student report
        </p>
        <a
          href={`/teacher/dashboard/${className}`}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, textDecoration: "none" }}
        >
          Back to attendance
        </a>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : !data || data.error ? (
          <p style={{ fontSize: 13, color: COLORS.red }}>{data?.error || "Could not load report."}</p>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 20, color: COLORS.navy, margin: "0 0 4px" }}>{data.name}</p>
              <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>
                {/^\d+$/.test(className) ? `Class ${className}` : className} · {data.id}
              </p>
            </div>

            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setPreset(15)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 5, border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.ink, cursor: "pointer" }}>
                Last 15 days
              </button>
              <button onClick={() => setPreset(30)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 5, border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.ink, cursor: "pointer" }}>
                Last 30 days
              </button>
              <span style={{ fontSize: 12, color: COLORS.muted }}>or custom range:</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, border: "1px solid #DBD8CC", borderRadius: 5 }} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>to</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, border: "1px solid #DBD8CC", borderRadius: 5 }} />
            </div>

            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", marginRight: 8 }}
              >
                {downloading ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button
                onClick={handlePrint}
                style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
              >
                Print
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Average attendance</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: average == null ? COLORS.muted : average >= 75 ? "#27500A" : COLORS.red, margin: 0 }}>
                  {average == null ? "—" : `${average}%`}
                </p>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Present</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#27500A", margin: 0 }}>{presentCount}</p>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Absent</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#791F1F", margin: 0 }}>{absentCount}</p>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Leave</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "#8A5B00", margin: 0 }}>{leaveCount}</p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#9A9A90", margin: "0 0 12px" }}>
              Average is calculated only from days attendance was actually marked ({fromDate} to {toDate}) —
              holidays and unmarked days are not counted.
            </p>

            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
              {rangeHistory.map((a, i) => {
                const info = STATUS_LABEL[a.status];
                return (
                  <div key={a.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 13.5, color: COLORS.ink }}>{a.date}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: info?.color, background: info?.bg, padding: "4px 12px", borderRadius: 4 }}>
                      {info?.label || a.status}
                    </span>
                  </div>
                );
              })}
              {rangeHistory.length === 0 && (
                <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No attendance recorded in this range.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
