"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadElementAsPdf, safeFileName } from "../../../lib/downloadPdf";
import { COLORS } from "../../../lib/theme";
import NotificationSetup from "../../../components/NotificationSetup";
import { pktDateStr } from "../../../lib/time";

const STATUS_LABEL = {
  present: { label: "Present", color: "#27500A", bg: "#EAF3DE" },
  absent: { label: "Absent", color: "#791F1F", bg: "#FCEBEB" },
  leave: { label: "Leave", color: "#8A5B00", bg: "#FCEFD6" },
};

function toISODate(d) {
  return pktDateStr(d);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(daysAgo(14));
  const [toDate, setToDate] = useState(toISODate(new Date()));
  const [tests, setTests] = useState({ live: [], results: [] });

  function loadMain() {
    fetch("/api/parent-me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {});
  }

  function loadTests() {
    fetch("/api/online-tests/parent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.live)) setTests({ live: d.live, results: d.results || [] });
      })
      .catch(() => {});
  }

  // Checked every 20 seconds — AND immediately whenever this tab/app comes
  // back to the foreground (opened from a notification, switched back
  // to, phone unlocked...). Background tabs get throttled by the browser,
  // so without this a test that started while the tab was in the
  // background would not show up until the next lucky poll.
  useEffect(() => {
    function refreshNow() {
      loadTests();
      loadMain();
    }

    refreshNow();
    const timer = setInterval(loadTests, 20000);

    function onVisible() {
      if (document.visibilityState === "visible") refreshNow();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshNow);

    function onSwMessage(event) {
      if (event.data?.type === "refresh") refreshNow();
    }
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshNow);
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/parent");
  }

  const [downloading, setDownloading] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadElementAsPdf(document.getElementById("pdf-area"), safeFileName("Attendance", data?.name || data?.studentName || "student"));
    } catch (err) {
      alert(err.message || "Could not create the PDF.");
    }
    setDownloading(false);
  }

  function setPreset(days) {
    setFromDate(daysAgo(days - 1));
    setToDate(toISODate(new Date()));
  }

  const fullHistory = data?.attendance || [];
  // Only dates that were actually marked appear in history at all, so
  // holidays / days nobody marked attendance never enter this list —
  // they can't drag the average down.
  const visibleHistory = fullHistory.filter((a) => a.date >= fromDate && a.date <= toDate);
  const presentCount = visibleHistory.filter((a) => a.status === "present").length;
  const absentCount = visibleHistory.filter((a) => a.status === "absent").length;
  const leaveCount = visibleHistory.filter((a) => a.status === "leave").length;
  const totalMarked = visibleHistory.length;
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
          Parent dashboard
        </p>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : !data || data.error ? (
          <p style={{ fontSize: 13, color: COLORS.red }}>{data?.error || "Could not load student info."}</p>
        ) : (
          <>
            <div className="no-print">
              <NotificationSetup role="parent" studentId={data.id} />
            </div>
            {tests.live
              .filter((t) => !t.submitted)
              .map((t) => (
                <a
                  key={t.id}
                  href={`/parent/dashboard/test/${t.id}`}
                  className="no-print"
                  style={{ display: "block", background: COLORS.red, color: "#fff", borderRadius: 8, padding: "14px 18px", marginBottom: 14, textDecoration: "none", boxShadow: "0 2px 10px rgba(200,16,46,0.35)" }}
                >
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>
                    {t.enrolled ? "Test in progress - Continue" : "Test Has Been Started - Enroll Now"}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>
                    {t.title}{t.subject ? ` · ${t.subject}` : ""} · {t.durationMin} min
                  </span>
                </a>
              ))}
            <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <a href="/parent/dashboard/results" style={{ background: COLORS.navy, color: "#fff", padding: "9px 18px", borderRadius: 5, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                Test Results
              </a>
              <a href="/parent/dashboard/fee" style={{ background: COLORS.red, color: "#fff", padding: "9px 18px", borderRadius: 5, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                Fee Challan
              </a>
              <a href="/parent/dashboard/online-tests" style={{ background: COLORS.ink, color: "#fff", padding: "9px 18px", borderRadius: 5, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                Online Tests{tests.results.length > 0 ? ` (${tests.results.length})` : ""}
              </a>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 20, color: COLORS.navy, margin: "0 0 4px" }}>{data.name}</p>
                <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>
                  {/^\d+$/.test(data.className) ? `Class ${data.className}` : data.className}
                </p>
              </div>
              {data.fee != null && (
                <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "right" }}>
                  <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 2px" }}>Monthly fee</p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: COLORS.navy, margin: 0 }}>Rs. {data.fee.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setPreset(15)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 5, border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.ink, cursor: "pointer" }}>
                Last 15 days
              </button>
              <button onClick={() => setPreset(30)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, borderRadius: 5, border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.ink, cursor: "pointer" }}>
                Last 30 days
              </button>
              <span style={{ fontSize: 12, color: COLORS.muted }}>or pick a custom range:</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, border: `1px solid #DBD8CC`, borderRadius: 5 }} />
              <span style={{ fontSize: 12, color: COLORS.muted }}>to</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5, border: `1px solid #DBD8CC`, borderRadius: 5 }} />
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
              holidays and unmarked days are not counted against your child.
            </p>

            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
              {visibleHistory.map((a, i) => {
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
              {visibleHistory.length === 0 && (
                <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No attendance recorded in this range.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
