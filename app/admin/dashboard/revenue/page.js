"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";
import { pktDateStr } from "../../../../lib/time";
import { MONTH_LABELS } from "../../../../lib/revenue";
import { demoRevenue } from "../../../../lib/revenueDemo";

const YEAR_COLORS = ["#22C55E", "#F0A500", "#60A5FA"]; // current, last, old
// The website went live in 2026 — never show years before that (there is
// no real data for them). As each new year runs, it joins this list on
// its own; nothing needs to change here.
const LAUNCH_YEAR = 2026;
const PIE_COLORS = ["#16215E", "#C8102E", "#F0A500", "#22C55E", "#60A5FA", "#A855F7", "#14B8A6", "#F97316", "#EC4899", "#84CC16", "#6366F1", "#EAB308", "#64748B"];

const rs = (n) => `Rs. ${Math.round(n || 0).toLocaleString("en-PK")}`;
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`);
const pct = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);

function Growth({ value, label }) {
  if (value === null) return <span style={{ fontSize: 12, color: COLORS.muted }}>No data {label}</span>;
  const up = value >= 0;
  return (
    <span style={{ fontSize: 12.5, fontWeight: 600, color: up ? "#15803D" : "#B91C1C" }}>
      {up ? "▲ +" : "▼ "}{value.toFixed(1)}% <span style={{ fontWeight: 400, color: COLORS.muted }}>{label}</span>
    </span>
  );
}

const card = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "18px 20px" };
const sel = { padding: "8px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 6, background: "#fff" };

function TradingTooltip({ active, payload, label, years }) {
  if (!active || !payload?.length) return null;
  const by = {};
  payload.forEach((p) => (by[p.dataKey] = p.value));
  const g1 = pct(by[years[0]], by[years[1]]);
  const g2 = pct(by[years[0]], by[years[2]]);
  return (
    <div style={{ background: "#0C1230", border: "1px solid #2B3566", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 12.5, minWidth: 190 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#C6CBE0" }}>{label}</p>
      {years.map((y, i) => (
        <p key={y} style={{ margin: "3px 0", display: "flex", justifyContent: "space-between", gap: 14 }}>
          <span style={{ color: YEAR_COLORS[i] }}>● {y}</span>
          <b>{rs(by[y])}</b>
        </p>
      ))}
      {years.length > 1 && (
        <div style={{ borderTop: "1px solid #2B3566", marginTop: 6, paddingTop: 6, fontSize: 12 }}>
          <p style={{ margin: "2px 0", color: g1 === null ? "#94A3B8" : g1 >= 0 ? "#4ADE80" : "#F87171" }}>vs {years[1]}: {g1 === null ? "—" : `${g1 >= 0 ? "+" : ""}${g1.toFixed(1)}%`}</p>
          {years.length > 2 && (
            <p style={{ margin: "2px 0", color: g2 === null ? "#94A3B8" : g2 >= 0 ? "#4ADE80" : "#F87171" }}>vs {years[2]}: {g2 === null ? "—" : `${g2 >= 0 ? "+" : ""}${g2.toFixed(1)}%`}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RevenuePage() {
  const today = pktDateStr();
  const curYear = Number(today.slice(0, 4));
  const curMonth = Number(today.slice(5, 7));
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState("all");
  const [demo, setDemo] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [openClass, setOpenClass] = useState(null);
  const [resetting, setResetting] = useState(false);
  // Always the REAL current month's collection — fetched once, independent
  // of whatever year/month the admin has filtered the rest of the page to,
  // so "This Month" never goes wrong just because a different year is being browsed.
  const [thisMonth, setThisMonth] = useState(null);
  const thisMonthCollected = thisMonth ? thisMonth.collected : null;

  function loadThisMonth() {
    fetch(`/api/revenue?year=${curYear}&month=${curMonth}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const sm = d.summary || {};
        const collected = d.classes?.reduce((t, c) => t + c.collected, 0) ?? 0;
        const due = d.classes?.reduce((t, c) => t + c.due, 0) ?? 0;
        setThisMonth({
          collected,
          due,
          expected: sm.expected ?? collected + due,
          paidCount: sm.paidCount ?? 0,
          partialCount: sm.partialCount ?? 0,
          unpaidCount: sm.unpaidCount ?? 0,
          vouchers: sm.vouchers ?? 0,
        });
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadThisMonth();
    // keep it fresh while the page stays open (a fee marked paid shows up within a minute)
    const t = setInterval(loadThisMonth, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resetRevenue() {
    const sure = confirm(
      "This will permanently delete the entire fee voucher history (all months, all students) and immediately create fresh unpaid vouchers for the current month. This cannot be undone. Do you want to continue?"
    );
    if (!sure) return;
    setResetting(true);
    try {
      const res = await fetch("/api/revenue/reset", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not reset.");
      setYear(curYear);
      setMonth("all");
      loadThisMonth();
      // Re-trigger the data fetch below with a cache-busting reload.
      setData(null);
      fetch(`/api/revenue?year=${curYear}&month=all`, { cache: "no-store" })
        .then(async (r) => { const jj = await r.json(); if (r.ok) setData(jj); })
        .catch(() => {});
    } catch (err) {
      alert(err.message || "Could not reset.");
    }
    setResetting(false);
  }

  useEffect(() => {
    if (demo) { setData(demoRevenue(year, month)); setErr(""); return; }
    setData(null);
    fetch(`/api/revenue?year=${year}&month=${month}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Could not load."); setData(j); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [year, month, demo]);

  // Up to 3 years back for comparison, but never before LAUNCH_YEAR —
  // e.g. in 2026 this is just [2026]; once 2027 starts, [2027, 2026].
  const years = [];
  for (let y = year; y >= LAUNCH_YEAR && years.length < 3; y--) years.push(y);
  const cutoff = year === curYear ? curMonth : 12; // compare same months only

  const calc = useMemo(() => {
    if (!data) return null;
    const sum = (arr, n) => arr.slice(0, n).reduce((t, v) => t + v, 0);
    const [a, b, c] = years.map((y) => sum(data.monthly[y] || [], cutoff));
    const collected = data.classes.reduce((t, x) => t + x.collected, 0);
    const due = data.classes.reduce((t, x) => t + x.due, 0);
    const line = MONTH_LABELS.map((m, i) => {
      const row = { month: m };
      years.forEach((y) => {
        row[y] = y === curYear && i + 1 > curMonth ? null : data.monthly[y]?.[i] ?? 0;
      });
      return row;
    });
    return { a, b, c, collected, due, line };
  }, [data, year, cutoff]);

  const emptyReal = !demo && calc && calc.a + calc.b + calc.c === 0;
  const periodLabel = month === "all" ? `${year}` : `${MONTH_LABELS[Number(month) - 1]} ${year}`;
  const pieData = data ? data.classes.filter((c) => c.collected > 0).map((c) => ({ name: c.label, value: c.collected })) : [];
  const pieTotal = pieData.reduce((t, x) => t + x.value, 0);
  const modalClass = data?.classes.find((c) => c.className === openClass);

  return (
    <AdminShell title="Revenue Analysis">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <select style={sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: curYear - LAUNCH_YEAR + 1 }, (_, i) => curYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={sel} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">Full year</option>
          {MONTH_LABELS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <label style={{ fontSize: 13, color: COLORS.ink, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Demo data
        </label>
        <button onClick={resetRevenue} disabled={resetting}
          style={{ marginLeft: "auto", background: "#fff", border: "1px solid #C8102E", color: "#C8102E", borderRadius: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: resetting ? 0.6 : 1 }}>
          {resetting ? "Resetting..." : "Reset Revenue"}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "-12px 0 18px" }}>
        Reset deletes all fee-voucher history and starts fresh from current students' current-month fee status.
      </p>

      {err && <p style={{ color: "#B91C1C", fontSize: 13 }}>{err}</p>}
      {!data && !err && <p style={{ color: COLORS.muted, fontSize: 13 }}>Loading…</p>}
      {emptyReal && (
        <div style={{ ...card, marginBottom: 16, background: "#FFF8E6", borderColor: "#F0D48A", fontSize: 13 }}>
          There are no payment records yet. Revenue will appear here as soon as a voucher is marked &quot;verified&quot; in Fee Verification. To preview this page, tick <b>Demo data</b> above.
        </div>
      )}

      {calc && (
        <>
          {/* THIS MONTH — always the real current month */}
          {thisMonth && (() => {
            const rate = thisMonth.expected > 0 ? Math.min(100, Math.round((thisMonth.collected / thisMonth.expected) * 100)) : 0;
            return (
              <div style={{ ...card, marginBottom: 18, borderColor: "#B7D79A", background: "linear-gradient(180deg,#F6FBF1,#fff)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: COLORS.navy }}>This month — {MONTH_LABELS[curMonth - 1]} {curYear}</p>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>Updates by itself every minute</span>
                </div>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#15803D", margin: "8px 0 2px" }}>{rs(thisMonth.collected)}</p>
                <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 12px" }}>collected so far this month</p>
                <div style={{ height: 10, background: "#E8E6DC", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ width: `${rate}%`, height: "100%", background: "#22C55E" }} />
                </div>
                <p style={{ fontSize: 12.5, color: COLORS.ink, margin: "0 0 14px" }}><b>{rate}%</b> of this month's expected fee ({rs(thisMonth.expected)}) is collected</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted }}>Still to collect</p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#B91C1C" }}>{rs(thisMonth.due)}</p>
                  </div>
                  <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted }}>Fully paid</p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#15803D" }}>{thisMonth.paidCount} <span style={{ fontSize: 11.5, fontWeight: 400, color: COLORS.muted }}>students</span></p>
                  </div>
                  <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted }}>Partly paid</p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#8A5B00" }}>{thisMonth.partialCount} <span style={{ fontSize: 11.5, fontWeight: 400, color: COLORS.muted }}>students</span></p>
                  </div>
                  <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11.5, color: COLORS.muted }}>Not paid yet</p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#B91C1C" }}>{thisMonth.unpaidCount} <span style={{ fontSize: 11.5, fontWeight: 400, color: COLORS.muted }}>students</span></p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
            <div style={card}>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>Revenue {year}{year === curYear ? " (year to date)" : ""}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: COLORS.navy, margin: "0 0 6px" }}>{rs(calc.a)}</p>
              {years.length > 1 ? <Growth value={pct(calc.a, calc.b)} label={`vs ${years[1]}`} /> : <span style={{ fontSize: 12, color: COLORS.muted }}>First year — no prior year to compare</span>}
            </div>
            {years.length > 1 && (
              <div style={card}>
                <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>Revenue {years[1]}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: COLORS.navy, margin: "0 0 6px" }}>{rs(calc.b)}</p>
                {years.length > 2 ? <Growth value={pct(calc.b, calc.c)} label={`vs ${years[2]}`} /> : <span style={{ fontSize: 12, color: COLORS.muted }}>&nbsp;</span>}
              </div>
            )}
            {years.length > 2 && (
              <div style={card}>
                <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>{year} vs {years[2]}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: COLORS.navy, margin: "0 0 6px" }}>{rs(calc.c)}</p>
                <Growth value={pct(calc.a, calc.c)} label={`vs ${years[2]}`} />
              </div>
            )}
            <div style={card}>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>This Month · {MONTH_LABELS[curMonth - 1]} {curYear}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#15803D", margin: "0 0 6px" }}>
                {thisMonthCollected === null ? "…" : rs(thisMonthCollected)}
              </p>
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>Always this real-world month, whatever filter is picked above</span>
            </div>
            <div style={card}>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>Collected · {periodLabel}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#15803D", margin: "0 0 6px" }}>{rs(calc.collected)}</p>
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>
                Collection rate {calc.collected + calc.due > 0 ? Math.round((calc.collected / (calc.collected + calc.due)) * 100) : 0}%
              </span>
            </div>
            <div style={card}>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 6px" }}>Total Due · {periodLabel}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#B91C1C", margin: "0 0 6px" }}>{rs(calc.due)}</p>
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>Unpaid + partial balances</span>
            </div>
          </div>

          {/* Trading-style line chart */}
          <div style={{ background: "#0C1230", borderRadius: 12, padding: "18px 14px 10px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "0 8px 10px" }}>
              <p style={{ margin: 0, color: "#fff", fontWeight: 600, fontSize: 15 }}>Revenue Comparison · {years.join(" vs ")}</p>
              {years.length > 1 && <Growth value={pct(calc.a, calc.b)} label={`vs ${years[1]}`} />}
            </div>
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={calc.line} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1F2A5C" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#8B94C4" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#8B94C4" tick={{ fontSize: 12 }} tickFormatter={short} width={48} />
                  <Tooltip content={<TradingTooltip years={years} />} cursor={{ stroke: "#8B94C4", strokeDasharray: "4 4" }} />
                  <Legend wrapperStyle={{ color: "#C6CBE0", fontSize: 12 }} />
                  {years.map((y, i) => (
                    <Line key={y} type="monotone" dataKey={String(y)} stroke={YEAR_COLORS[i]} strokeWidth={i === 0 ? 3 : 2}
                      dot={false} activeDot={{ r: 5 }} connectNulls={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar + Donut */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 18 }}>
            <div style={card}>
              <p style={{ margin: "0 0 10px", fontWeight: 600, color: COLORS.navy }}>Class-wise Revenue · {periodLabel}</p>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={data.classes} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                    <CartesianGrid stroke="#EEE" vertical={false} />
                    <XAxis dataKey="label" interval={0} angle={-40} textAnchor="end" tick={{ fontSize: 11 }} height={50} />
                    <YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={44} />
                    <Tooltip formatter={(v) => rs(v)} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="collected" name="Collected" fill="#22C55E" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="due" name="Due" fill="#C8102E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={card}>
              <p style={{ margin: "0 0 10px", fontWeight: 600, color: COLORS.navy }}>Revenue Distribution by Class</p>
              {pieTotal === 0 ? <p style={{ fontSize: 13, color: COLORS.muted }}>No collected revenue in this period.</p> : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="82%" paddingAngle={2}
                        label={({ percent }) => (percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : "")} labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${rs(v)} (${((v / pieTotal) * 100).toFixed(1)}%)`, n]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Class cards */}
          <p style={{ margin: "0 0 10px", fontWeight: 600, color: COLORS.navy }}>Class-wise Due — click a card to see students</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
            {data.classes.map((c) => (
              <button key={c.className} onClick={() => setOpenClass(c.className)}
                style={{ ...card, textAlign: "left", cursor: "pointer", padding: "14px 16px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 13.5, fontWeight: 600, color: COLORS.navy }}>{c.label}</p>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: COLORS.muted }}>Collected</p>
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#15803D" }}>{rs(c.collected)}</p>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: COLORS.muted }}>Due</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.due > 0 ? "#B91C1C" : COLORS.muted }}>{rs(c.due)}</p>
                <p style={{ margin: "6px 0 0", fontSize: 11.5, color: COLORS.muted }}>{c.students.length} student(s) pending</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Due students modal */}
      {modalClass && (
        <div onClick={() => setOpenClass(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(12,18,48,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 900, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: COLORS.navy }}>{modalClass.label} — Pending Dues ({periodLabel})</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: COLORS.muted }}>Total due: <b style={{ color: "#B91C1C" }}>{rs(modalClass.due)}</b> · {modalClass.students.length} student(s)</p>
              </div>
              <button onClick={() => setOpenClass(null)} style={{ border: "none", background: COLORS.tint, borderRadius: 6, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ overflow: "auto", padding: "0 4px 8px" }}>
              {modalClass.students.length === 0 ? (
                <p style={{ padding: 24, fontSize: 13.5, color: COLORS.muted }}>This class has no dues. 🎉</p>
              ) : (
                <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: COLORS.tint, textAlign: "left", color: COLORS.navy, position: "sticky", top: 0 }}>
                      {["Student Name", "Father Name", "Class", "Monthly Fee", "Paid", "Due", "Phone"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modalClass.students.map((s) => (
                      <tr key={s.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: "9px 12px" }}>{s.name}</td>
                        <td style={{ padding: "9px 12px" }}>{s.fatherName || "—"}</td>
                        <td style={{ padding: "9px 12px" }}>{modalClass.label}</td>
                        <td style={{ padding: "9px 12px" }}>{rs(s.monthlyFee)}</td>
                        <td style={{ padding: "9px 12px", color: "#15803D" }}>{rs(s.paid)}</td>
                        <td style={{ padding: "9px 12px", color: "#B91C1C", fontWeight: 600 }}>{rs(s.due)}</td>
                        <td style={{ padding: "9px 12px" }}>{s.phone ? <a href={`tel:${s.phone}`} style={{ color: COLORS.navy }}>{s.phone}</a> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
