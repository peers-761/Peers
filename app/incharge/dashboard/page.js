"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, CLASSES } from "../../../lib/theme";
import { pktDateStr } from "../../../lib/time";

function todayStr() {
  return pktDateStr();
}

function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

// Keep only digits and a leading + so the phone dialer accepts it.
function dialNumber(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned.length >= 5 ? cleaned : "";
}

export default function InchargeDashboardPage() {
  const router = useRouter();
  // No date is pre-selected — absentees only load once the incharge picks
  // a date themselves (or taps "Today"), never automatically on open.
  const [date, setDate] = useState("");
  const [absentees, setAbsentees] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");

  async function load(selectedDate) {
    setLoading(true);
    try {
      const absRes = await fetch(`/api/todays-absentees?date=${selectedDate}`, { cache: "no-store" });
      if (!absRes.ok) throw new Error("absentees failed");
      const absData = await absRes.json();
      setAbsentees(Array.isArray(absData.absentees) ? absData.absentees : []);
      setRemarks(Array.isArray(absData.reasons) ? absData.reasons : []);
      setError("");
    } catch (err) {
      setError("Could not load this date's data. Check your internet and try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!date) {
      setAbsentees([]);
      setRemarks([]);
      setLoading(false);
      return;
    }
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/incharge");
  }

  const isToday = date === todayStr();

  const filtered = absentees
    .filter((a) => classFilter === "All" || a.className === classFilter)
    .filter((a) => sectionFilter === "All" || a.section === sectionFilter)
    // Students whose reason is still missing come first.
    .sort((a, b) => Number(a.reasonSubmitted) - Number(b.reasonSubmitted));
  // The "reasons submitted" list follows the same class + Boys/Girls choice.
  const filteredRemarks = remarks
    .filter((r) => classFilter === "All" || r.className === classFilter)
    .filter((r) => sectionFilter === "All" || r.section === sectionFilter);
  const pendingCount = filtered.filter((a) => !a.reasonSubmitted).length;

  function chipStyle(active) {
    return {
      padding: "6px 13px",
      fontSize: 12.5,
      fontWeight: 500,
      borderRadius: 5,
      border: `1px solid ${active ? COLORS.navy : COLORS.border}`,
      background: active ? COLORS.navy : "#fff",
      color: active ? "#fff" : COLORS.ink,
      cursor: "pointer",
    };
  }
  const countFor = (c) => absentees.filter((a) => c === "All" || a.className === c).length;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Incharge Dashboard
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/incharge/dashboard/fees" style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, textDecoration: "none" }}>
            Fee Verification
          </a>
          <a href="/incharge/dashboard/test-reports" style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, textDecoration: "none" }}>
            Test Reports
          </a>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: 0 }}>
            {!date ? "Absentees" : isToday ? "Today's Absentees" : `Absentees — ${date}`}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
            />
            <button
              onClick={() => setDate(todayStr())}
              style={{ background: isToday ? COLORS.navy : "none", color: isToday ? "#fff" : COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: 5, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
            >
              Today
            </button>
          </div>
        </div>

        {!date ? (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, marginTop: 8 }}>
            <p style={{ fontSize: 13.5, color: COLORS.ink, margin: 0 }}>
              Select a date above to see absentees, or tap &quot;Today&quot;.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px" }}>
              Call the parent to ask the reason if it hasn't been submitted through the Parent Portal yet.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {["All", ...CLASSES].map((c) => (
                <button key={c} onClick={() => setClassFilter(c)} style={chipStyle(classFilter === c)}>
                  {c === "All" ? "All classes" : classLabel(c)}
                  {countFor(c) > 0 ? ` (${countFor(c)})` : ""}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {["All", "Boys", "Girls"].map((sec) => (
                <button key={sec} onClick={() => setSectionFilter(sec)} style={chipStyle(sectionFilter === sec)}>
                  {sec}
                </button>
              ))}
            </div>

            {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : error ? (
          <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, marginBottom: 32 }}>
            <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>No absentees for this selection.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 8px" }}>
              {filtered.length} absent · {pendingCount} without a reason
            </p>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 32 }}>
              {filtered.map((a, i) => {
                const dial = dialNumber(a.parentPhone);
                const pending = !a.reasonSubmitted;
                return (
                  <div
                    key={a.studentId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                      borderLeft: `4px solid ${pending ? "#C8102E" : "#4C9A2A"}`,
                      background: pending ? "#FCEBEB" : "#fff",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: pending ? "#791F1F" : COLORS.ink, margin: 0 }}>{a.studentName}</p>
                      <p style={{ fontSize: 12, color: pending ? "#A04040" : "#9A9A90", margin: 0 }}>
                        {classLabel(a.className)} · {a.section} · {a.parentPhone || "No number on file"}
                      </p>
                      {!pending && a.reason && (
                        <p style={{ fontSize: 12, color: "#27500A", margin: "2px 0 0" }}>Reason: {a.reason}</p>
                      )}
                    </div>
                    {pending ? (
                      dial ? (
                        <a
                          href={`tel:${dial}`}
                          style={{ background: "#C8102E", color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 600, padding: "8px 16px", borderRadius: 5 }}
                        >
                          📞 Call
                        </a>
                      ) : (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#791F1F" }}>No number</span>
                      )
                    ) : (
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#27500A", background: "#EAF3DE", padding: "5px 12px", borderRadius: 4 }}>
                        Reason submitted
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
            )}

            <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "24px 0 16px" }}>
              Absence Reasons Submitted — {date}
            </p>
            {filteredRemarks.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.muted }}>None submitted for this selection.</p>
            ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredRemarks.map((r) => (
              <div key={r.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{r.studentName}</p>
                    <p style={{ fontSize: 12, color: "#9A9A90", margin: 0 }}>{classLabel(r.className)} · {r.section}</p>
                  </div>
                  <span style={{ fontSize: 12, color: "#9A9A90" }}>{r.date}</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.ink, margin: "0 0 4px" }}><strong>Reason:</strong> {r.reason}</p>
                {r.remarks && <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>{r.remarks}</p>}
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
