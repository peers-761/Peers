"use client";

// Date-to-date fee collection report for the admin:
// how much money came in between two dates, who paid, who still has not,
// day-by-day graph, class-wise totals — with Excel (CSV) download.

import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { COLORS } from "../lib/theme";
import { pktDateStr } from "../lib/time";

const rs = (n) => `Rs. ${Math.round(n || 0).toLocaleString("en-PK")}`;
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`);
const card = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 18px" };
const inp = { padding: "8px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 6, background: "#fff" };

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000) + 1;
}
function fmt(d) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function csv(rows) {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}
function download(name, text) {
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export default function CollectionReport() {
  const today = pktDateStr();
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastMonthEnd = addDays(monthStart, -1);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;

  const presets = [
    { key: "today", label: "Today", from: today, to: today },
    { key: "yesterday", label: "Yesterday", from: addDays(today, -1), to: addDays(today, -1) },
    { key: "7", label: "Last 7 days", from: addDays(today, -6), to: today },
    { key: "month", label: "This month", from: monthStart, to: today },
    { key: "last", label: "Last month", from: lastMonthStart, to: lastMonthEnd },
  ];

  const [preset, setPreset] = useState("month");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("paid");
  const [loading, setLoading] = useState(false);

  async function load(f = from, t = to) {
    if (!f || !t || f > t) {
      setErr("Pick a valid 'from' and 'to' date (from cannot be after to).");
      return;
    }
    setErr("");
    setLoading(true);
    const len = daysBetween(f, t);
    const pf = addDays(f, -len);
    const pt = addDays(f, -1);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/revenue?from=${f}&to=${t}`, { cache: "no-store" }),
        fetch(`/api/revenue?from=${pf}&to=${pt}`, { cache: "no-store" }),
      ]);
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Could not load the report.");
      setData(d1);
      const d2 = await r2.json().catch(() => null);
      setPrev(r2.ok ? d2 : null);
    } catch (e) {
      setErr(e.message || "Could not load the report.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load(monthStart, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(p) {
    setPreset(p.key);
    setFrom(p.from);
    setTo(p.to);
    load(p.from, p.to);
  }

  const growth = data && prev && prev.received > 0 ? ((data.received - prev.received) / prev.received) * 100 : null;
  const len = daysBetween(from, to);
  const busiest = data?.byDay?.reduce((m, d) => (d.amount > (m?.amount || 0) ? d : m), null);

  function exportPaid() {
    download(
      `Fee-received_${data.from}_to_${data.to}.csv`,
      csv([
        ["Date", "Student", "Father", "Class", "Fee month", "Amount received", "Received by"],
        ...data.payments.map((p) => [p.date, p.name, p.fatherName, p.classLabel, p.month, p.amount, p.by]),
      ])
    );
  }
  function exportNotPaid() {
    download(
      `Fee-not-paid_${data.from}_to_${data.to}.csv`,
      csv([
        ["Student", "Father", "Class", "Balance due", "Phone"],
        ...data.notPaid.map((s) => [s.name, s.fatherName, s.classLabel, s.due, s.phone]),
      ])
    );
  }

  const box = (label, value, color, sub) => (
    <div style={{ background: COLORS.tint, borderRadius: 8, padding: "12px 14px" }}>
      <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 19, fontWeight: 800, color }}>{value}</p>
      {sub ? <p style={{ margin: "2px 0 0", fontSize: 11.5, color: COLORS.muted }}>{sub}</p> : null}
    </div>
  );

  return (
    <div style={{ ...card, marginBottom: 18 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: COLORS.navy }}>Collection report — date to date</p>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.muted }}>
        Money that actually came in between two dates (counted on the day it was received), who paid and who has not.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {presets.map((p) => (
          <button key={p.key} onClick={() => pick(p)} style={{ padding: "6px 12px", fontSize: 12.5, borderRadius: 16, cursor: "pointer", border: `1px solid ${preset === p.key ? COLORS.navy : COLORS.border}`, background: preset === p.key ? COLORS.navy : "#fff", color: preset === p.key ? "#fff" : COLORS.navy }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, color: COLORS.muted }}>From</label>
        <input type="date" value={from} max={today} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} style={inp} />
        <label style={{ fontSize: 12.5, color: COLORS.muted }}>To</label>
        <input type="date" value={to} max={today} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} style={inp} />
        <button onClick={() => load()} disabled={loading} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Loading..." : "Show report"}
        </button>
      </div>

      {err && <p style={{ color: "#B91C1C", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}

      {data && (
        <>
          <p style={{ fontSize: 12.5, color: COLORS.ink, margin: "0 0 10px" }}>
            <b>{fmt(data.from)}</b> to <b>{fmt(data.to)}</b> ({len} day{len > 1 ? "s" : ""})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
            {box("Money received", rs(data.received), "#15803D", growth === null ? (prev ? "Nothing in the period before" : "") : `${growth >= 0 ? "▲ +" : "▼ "}${growth.toFixed(1)}% vs previous ${len} day${len > 1 ? "s" : ""}`)}
            {box("Students who paid", String(data.paidStudents), COLORS.navy, `${data.paymentsCount} payment${data.paymentsCount === 1 ? "" : "s"}`)}
            {box("Still owe, paid nothing", String(data.notPaidCount), "#B91C1C", `${rs(data.notPaidAmount)} pending`)}
            {box("Busiest day", busiest && busiest.amount > 0 ? rs(busiest.amount) : "—", COLORS.navy, busiest && busiest.amount > 0 ? fmt(busiest.date) : "")}
          </div>

          {data.byDay.length > 1 && (
            <div style={{ width: "100%", height: 190, marginBottom: 14 }}>
              <ResponsiveContainer>
                <BarChart data={data.byDay} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EEE" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={short} tick={{ fontSize: 10.5 }} width={42} />
                  <Tooltip formatter={(v) => rs(v)} labelFormatter={(l) => `Day ${l}`} />
                  <Bar dataKey="amount" name="Received" fill="#22C55E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table style={{ width: "100%", minWidth: 380, borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: COLORS.tint, color: COLORS.navy, textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Class</th>
                  <th style={{ padding: "8px 10px" }}>Students paid</th>
                  <th style={{ padding: "8px 10px" }}>Received</th>
                </tr>
              </thead>
              <tbody>
                {data.byClass.filter((c) => c.received > 0).map((c) => (
                  <tr key={c.className} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: "7px 10px" }}>{c.label}</td>
                    <td style={{ padding: "7px 10px" }}>{c.students}</td>
                    <td style={{ padding: "7px 10px", color: "#15803D", fontWeight: 600 }}>{rs(c.received)}</td>
                  </tr>
                ))}
                {data.byClass.every((c) => c.received === 0) && (
                  <tr><td colSpan={3} style={{ padding: "12px 10px", color: COLORS.muted }}>No payment was received in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
            {[["paid", `Paid (${data.paidStudents})`], ["notpaid", `Not paid (${data.notPaidCount})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 14px", fontSize: 12.5, borderRadius: 6, cursor: "pointer", border: `1px solid ${tab === k ? COLORS.navy : COLORS.border}`, background: tab === k ? COLORS.navy : "#fff", color: tab === k ? "#fff" : COLORS.navy }}>
                {l}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button onClick={tab === "paid" ? exportPaid : exportNotPaid} style={{ background: "#fff", border: `1px solid ${COLORS.navy}`, color: COLORS.navy, borderRadius: 6, padding: "7px 14px", fontSize: 12.5, cursor: "pointer" }}>
              Download Excel (CSV)
            </button>
          </div>

          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
            {tab === "paid" ? (
              <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: COLORS.tint, color: COLORS.navy, textAlign: "left", position: "sticky", top: 0 }}>
                    {["Date", "Student", "Father", "Class", "Fee of", "Amount", "Received by"].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 && <tr><td colSpan={7} style={{ padding: 16, color: COLORS.muted }}>No payments in this period.</td></tr>}
                  {data.payments.slice(0, 300).map((p, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>{fmt(p.date)}</td>
                      <td style={{ padding: "7px 10px" }}>{p.name}</td>
                      <td style={{ padding: "7px 10px" }}>{p.fatherName || "—"}</td>
                      <td style={{ padding: "7px 10px" }}>{p.classLabel}</td>
                      <td style={{ padding: "7px 10px" }}>{p.month}</td>
                      <td style={{ padding: "7px 10px", color: "#15803D", fontWeight: 600 }}>{rs(p.amount)}</td>
                      <td style={{ padding: "7px 10px", color: COLORS.muted }}>{p.by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: COLORS.tint, color: COLORS.navy, textAlign: "left", position: "sticky", top: 0 }}>
                    {["Student", "Father", "Class", "Balance due", "Phone"].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.notPaid.length === 0 && <tr><td colSpan={5} style={{ padding: 16, color: COLORS.muted }}>Everyone with a balance paid something in this period. 🎉</td></tr>}
                  {data.notPaid.slice(0, 300).map((s) => (
                    <tr key={s.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "7px 10px" }}>{s.name}</td>
                      <td style={{ padding: "7px 10px" }}>{s.fatherName || "—"}</td>
                      <td style={{ padding: "7px 10px" }}>{s.classLabel}</td>
                      <td style={{ padding: "7px 10px", color: "#B91C1C", fontWeight: 600 }}>{rs(s.due)}</td>
                      <td style={{ padding: "7px 10px" }}>{s.phone ? <a href={`tel:${s.phone}`} style={{ color: COLORS.navy }}>{s.phone}</a> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {(tab === "paid" ? data.payments.length : data.notPaid.length) > 300 && (
            <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "6px 0 0" }}>First 300 rows shown — download the Excel file for the full list.</p>
          )}
        </>
      )}
    </div>
  );
}
