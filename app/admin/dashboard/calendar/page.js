"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

const TYPES = [
  { value: "holiday", label: "Public Holiday", color: "#8A5B00", bg: "#FCEFD6" },
  { value: "festival", label: "Festival", color: "#27500A", bg: "#EAF3DE" },
  { value: "lockdown", label: "Lockdown / Closure", color: "#791F1F", bg: "#FCEBEB" },
  { value: "exam", label: "Exam day", color: "#16215E", bg: "#E7E9F5" },
  { value: "other", label: "Other", color: "#5A5A52", bg: "#EEEDE6" },
];
const typeInfo = (v) => TYPES.find((t) => t.value === v) || TYPES[4];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayYmd() {
  return ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
}

export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [holidays, setHolidays] = useState(null);
  const [picked, setPicked] = useState(null); // date being edited
  const [form, setForm] = useState({ reason: "", type: "holiday" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => setHolidays(Array.isArray(s.holidays) ? s.holidays : []));
  }, []);

  const byDate = useMemo(() => {
    const m = {};
    for (const h of holidays || []) m[h.date] = h;
    return m;
  }, [holidays]);

  async function save(next) {
    setSaving(true);
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holidays: next }) });
    const s = await res.json();
    setHolidays(s.holidays || next);
    setSaving(false);
  }

  function openDay(date) {
    setPicked(date);
    const existing = byDate[date];
    setForm(existing ? { reason: existing.reason, type: existing.type || "holiday" } : { reason: "", type: "holiday" });
  }

  async function markDay() {
    if (!form.reason.trim()) return;
    const next = [...(holidays || []).filter((h) => h.date !== picked), { date: picked, reason: form.reason.trim(), type: form.type }].sort((a, b) => (a.date < b.date ? -1 : 1));
    await save(next);
    setPicked(null);
  }

  async function unmarkDay() {
    const next = (holidays || []).filter((h) => h.date !== picked);
    await save(next);
    setPicked(null);
  }

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = todayYmd();
  const upcoming = (holidays || []).filter((h) => h.date >= today).slice(0, 8);

  return (
    <AdminShell title="Calendar">
      <div style={{ maxWidth: 720 }}>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 16px" }}>
          Mark holidays, festivals, exam days, or lockdown closures in advance. On these dates teachers are
          never flagged absent, and the admin never gets an "absent" alert. Sundays are already skipped
          automatically and don't need to be added here.
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>‹ Prev</button>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 17, color: COLORS.navy, margin: 0 }}>{MONTHS[month]} {year}</p>
          <button onClick={() => changeMonth(1)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>Next ›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11.5, color: COLORS.muted, fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 20 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const date = ymd(year, month, d);
            const isSunday = new Date(year, month, d).getDay() === 0;
            const h = byDate[date];
            const info = h ? typeInfo(h.type) : null;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => (isSunday ? null : openDay(date))}
                disabled={isSunday}
                title={isSunday ? "Sunday (already off)" : h ? h.reason : "Tap to mark"}
                style={{
                  aspectRatio: "1",
                  border: isToday ? `2px solid ${COLORS.navy}` : `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  background: isSunday ? "#F2F1EA" : info ? info.bg : "#fff",
                  color: isSunday ? "#B5B2A6" : info ? info.color : COLORS.ink,
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 500,
                  cursor: isSunday ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {TYPES.map((t) => (
            <span key={t.value} style={{ fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: t.bg, border: `1px solid ${t.color}`, display: "inline-block" }} />
              {t.label}
            </span>
          ))}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 8px" }}>Upcoming</p>
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Nothing marked yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {upcoming.map((h) => {
              const info = typeInfo(h.type);
              return (
                <div key={h.date} style={{ display: "flex", justifyContent: "space-between", background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
                  <span>{h.reason}</span>
                  <span style={{ color: info.color }}>{h.date}</span>
                </div>
              );
            })}
          </div>
        )}

        {picked && (
          <div onClick={() => setPicked(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 380 }}>
              <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, color: COLORS.navy, margin: "0 0 12px" }}>{picked}</p>
              <label style={{ fontSize: 12, color: COLORS.muted }}>Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={{ width: "100%", padding: "9px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, margin: "4px 0 12px" }}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label style={{ fontSize: 12, color: COLORS.muted }}>Reason (e.g. Eid Holiday, 9th &amp; 10th board lockdown)</label>
              <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, margin: "4px 0 16px" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={markDay} disabled={saving || !form.reason.trim()} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Save</button>
                {byDate[picked] && (
                  <button onClick={unmarkDay} disabled={saving} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer", color: COLORS.red }}>Remove</button>
                )}
                <button onClick={() => setPicked(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
