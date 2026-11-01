"use client";

// Fee voucher manager used by BOTH the Incharge and the Admin.
//  - search / filter students
//  - open ANY student's full voucher and edit EVERY fee block
//  - mark paid / reject
//  - shortcut (button or Alt+A): put an amount (e.g. Annual Fund) into the
//    vouchers of all students, or of one class

import { useEffect, useMemo, useState } from "react";
import { COLORS, CLASSES } from "../lib/theme";
import { FEE_ITEMS, currentMonth } from "../lib/feeChallan";

const STATUS_INFO = {
  unpaid: { label: "Unpaid", color: "#791F1F", bg: "#FCEBEB" },
  pending: { label: "Pending review", color: "#8A5B00", bg: "#FCEFD6" },
  verified: { label: "Paid", color: "#27500A", bg: "#EAF3DE" },
  rejected: { label: "Rejected", color: "#791F1F", bg: "#FCEBEB" },
};

const inputBase = { padding: "8px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, boxSizing: "border-box" };

function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

function rs(n) {
  return `Rs. ${(Number(n) || 0).toLocaleString("en-PK")}`;
}

// ---------------------------------------------------------------------
// Typo-tolerant name search — so "ahmed khn" still finds "Ahmad Khan".
// No exact spelling needed; results are ranked, best match first.
// ---------------------------------------------------------------------
function levenshtein(a, b) {
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[al][bl];
}

function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// Returns 0-1: how well `query` matches `name` — tolerant of typos,
// wrong word order, and partial (first-name-only) search.
function nameMatchScore(query, name) {
  const q = query.toLowerCase().trim();
  const n = (name || "").toLowerCase().trim();
  if (!q) return 1;
  if (!n) return 0;
  if (n.includes(q)) return 1; // exact substring anywhere in the name — best possible
  const words = n.split(/\s+/).filter(Boolean);
  let best = similarity(q, n);
  for (const w of words) {
    if (w.startsWith(q)) best = Math.max(best, 0.96);
    best = Math.max(best, similarity(q, w));
  }
  return best;
}

const SEARCH_THRESHOLD = 0.45; // below this, a result is too different to show

// ---------------------------------------------------------------------
// The full voucher, laid out like the printed paper form.
// ---------------------------------------------------------------------
function VoucherEditor({ challan, onSaved, onChangeRequest }) {
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const serverItems = JSON.stringify(challan.items || {});
  useEffect(() => {
    const start = {};
    for (const it of FEE_ITEMS) start[it.key] = String(challan.items?.[it.key] || "");
    setVals(start);
    setMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverItems, challan.studentId, challan.month]);

  const total = FEE_ITEMS.reduce((t, it) => t + (Number(vals[it.key]) || 0), 0);
  const changed = FEE_ITEMS.some((it) => (Number(vals[it.key]) || 0) !== (challan.items?.[it.key] || 0));

  async function save(extra = {}) {
    setSaving(true);
    setMsg("");
    try {
      const items = {};
      for (const it of FEE_ITEMS) items[it.key] = Number(vals[it.key]) || 0;
      const res = await fetch("/api/receipt-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: challan.studentId, month: challan.month, items, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Could not save. Please try again.");
      } else {
        setMsg("Saved ✓");
        onSaved();
      }
    } catch {
      setMsg("Could not reach the server. Check your internet and try again.");
    }
    setSaving(false);
  }

  async function resetArrears() {
    setSaving(true);
    try {
      await fetch("/api/receipt-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: challan.studentId, month: challan.month, resetArrears: true }),
      });
      onSaved();
    } catch {}
    setSaving(false);
  }

  const cell = { padding: "6px 10px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 };

  return (
    <div style={{ marginTop: 12, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, background: "#FCFCFA" }}>
      <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, textDecoration: "underline", margin: "0 0 10px", color: COLORS.ink }}>
        Fee Voucher — {challan.month}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
        <tbody>
          <tr>
            <td style={{ ...cell, fontWeight: 600, width: "32%" }}>Name</td>
            <td style={cell}>{challan.studentName}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>Father's Name</td>
            <td style={cell}>{challan.fatherName || "-"}</td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>Class / Section</td>
            <td style={cell}>
              {classLabel(challan.className)} · {challan.section || "-"}
            </td>
          </tr>
          <tr>
            <td style={{ ...cell, fontWeight: 600 }}>Roll No / Month</td>
            <td style={cell}>
              {challan.rollNo || "-"} · {challan.month}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${COLORS.border}` }}>
        <thead>
          <tr style={{ background: COLORS.tint }}>
            <th style={{ ...cell, textAlign: "left" }}>Description</th>
            <th style={{ ...cell, textAlign: "right", width: 130 }}>Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {FEE_ITEMS.map((it) => (
            <tr key={it.key}>
              <td style={{ ...cell, color: it.key === "arrears" && Number(vals[it.key]) > 0 ? COLORS.red : COLORS.ink }}>
                {it.label}
                {it.key === "arrears" && (
                  <span style={{ fontSize: 10.5, color: "#9A9A90", marginLeft: 6 }}>
                    {challan.arrearsManual ? "(typed by hand)" : "(automatic)"}
                  </span>
                )}
              </td>
              <td style={{ ...cell, textAlign: "right" }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={vals[it.key] ?? ""}
                  onChange={(e) => setVals((v) => ({ ...v, [it.key]: e.target.value }))}
                  placeholder="0"
                  style={{ ...inputBase, width: 110, textAlign: "right", padding: "6px 8px" }}
                />
              </td>
            </tr>
          ))}
          <tr style={{ background: COLORS.tint }}>
            <td style={{ ...cell, fontWeight: 700 }}>Total Amount Payable</td>
            <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{rs(total)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <button
          onClick={() => save()}
          disabled={saving || !changed}
          style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving || !changed ? 0.5 : 1 }}
        >
          {saving ? "Saving..." : "Save voucher"}
        </button>
        <a
          href={`/api/fee-challans/pdf?studentId=${encodeURIComponent(challan.studentId)}&month=${challan.month}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...inputBase, textDecoration: "none", color: COLORS.navy, background: "#fff", cursor: "pointer" }}
        >
          Open PDF
        </a>
        {challan.arrearsManual && (
          <button onClick={resetArrears} disabled={saving} style={{ ...inputBase, background: "#fff", color: COLORS.navy, cursor: "pointer" }}>
            Reset arrears to automatic
          </button>
        )}
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("Saved") ? "#27500A" : COLORS.red }}>{msg}</span>}
      </div>
      <p style={{ fontSize: 11.5, color: "#9A9A90", margin: "10px 0 0" }}>
        Arrears (unpaid fee of earlier months) are added automatically. If an old month is marked paid, this voucher updates by itself.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------
export default function FeeManager({ onUnauthorized }) {
  const [challans, setChallans] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("All");
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState(null);

  // bulk dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkField, setBulkField] = useState("annualFund");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkClass, setBulkClass] = useState("All");
  const [bulkMode, setBulkMode] = useState("set");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/receipt-verification", { cache: "no-store" });
      if (res.status === 401) {
        if (onUnauthorized) onUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load.");
      setChallans(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load vouchers.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: Alt+A opens "add fee to all students"; Esc closes.
  useEffect(() => {
    function onKey(e) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setBulkMsg("");
        setBulkOpen(true);
      } else if (e.key === "Escape") {
        setBulkOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function updateStatus(studentId, m, status) {
    const res = await fetch("/api/receipt-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, month: m, status }),
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not update.");
    load();
  }

  // Part (or full) payment: the parent gave only some of the fee today.
  async function receivePayment(c) {
    const paid = Number(c.paidAmount) || 0;
    const left = Math.max(0, (Number(c.totalDue) || 0) - paid);
    const input = prompt(
      `${c.studentName} — ${c.month}\nTotal ${rs(c.totalDue)} · already received ${rs(paid)} · balance ${rs(left)}\n\nHow much did the parent give now? (type ${left} for the full balance)`,
      String(left)
    );
    if (input === null) return;
    const n = Math.round(Number(String(input).replace(/,/g, "")));
    if (!Number.isFinite(n) || n <= 0) return alert("Please type a valid amount.");
    const res = await fetch("/api/receipt-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: c.studentId, month: c.month, addPayment: n }),
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not save the payment.");
    load();
  }

  async function undoLastPayment(c) {
    const last = c.payments?.[c.payments.length - 1];
    if (!confirm(`Remove the last payment${last ? ` of ${rs(last.amount)}` : ""} for ${c.studentName} (${c.month})? Use this only if it was typed by mistake.`)) return;
    const res = await fetch("/api/receipt-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: c.studentId, month: c.month, undoLastPayment: true }),
    });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Could not undo.");
    load();
  }

  const months = useMemo(() => {
    const set = new Set(challans.map((c) => c.month));
    set.add(currentMonth());
    return [...set].sort().reverse();
  }, [challans]);

  const bulkTargets = challans.filter(
    (c) => c.month === currentMonth() && c.status !== "verified" && (bulkClass === "All" || c.className === bulkClass)
  );
  const bulkPaid = challans.filter(
    (c) => c.month === currentMonth() && c.status === "verified" && (bulkClass === "All" || c.className === bulkClass)
  ).length;

  async function applyBulk() {
    const amount = Number(bulkAmount);
    if (!Number.isFinite(amount) || amount < 0 || bulkAmount === "") {
      setBulkMsg("Enter an amount first.");
      return;
    }
    setBulkBusy(true);
    setBulkMsg("");
    try {
      const res = await fetch("/api/receipt-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: { field: bulkField, amount, mode: bulkMode, className: bulkClass === "All" ? null : bulkClass },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkMsg(data.error || "Could not apply. Please try again.");
      } else {
        setBulkMsg(`Done ✓ — added to ${data.updated} voucher(s).${data.skippedPaid ? ` ${data.skippedPaid} already-paid voucher(s) were not changed.` : ""}`);
        setBulkAmount("");
        load();
      }
    } catch {
      setBulkMsg("Could not reach the server. Check your internet and try again.");
    }
    setBulkBusy(false);
  }

  let filtered = challans.filter((c) => c.month === month);
  if (filter !== "all") filtered = filtered.filter((c) => c.status === filter);
  if (classFilter !== "All") filtered = filtered.filter((c) => c.className === classFilter);
  if (search.trim()) {
    // Typo-tolerant: score every candidate, keep decent matches, and show
    // the closest match first — an exact spelling is not required.
    filtered = filtered
      .map((c) => ({ c, score: nameMatchScore(search, c.studentName) }))
      .filter((x) => x.score >= SEARCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }

  const fieldLabel = FEE_ITEMS.find((i) => i.key === bulkField)?.label || "";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <button
          onClick={() => {
            setBulkMsg("");
            setBulkOpen(true);
          }}
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          + Add fee to all students
        </button>
        <span style={{ fontSize: 11.5, color: "#9A9A90" }}>Shortcut: Alt + A (on a computer keyboard)</span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search student name..."
        style={{ ...inputBase, width: "100%", fontSize: 14, padding: "10px 12px", marginBottom: 12 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={inputBase}>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
              {m === currentMonth() ? " (this month)" : ""}
            </option>
          ))}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={inputBase}>
          <option value="All">All classes</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {classLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {["all", "pending", "unpaid", "verified", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 5,
              border: `1px solid ${filter === f ? COLORS.navy : COLORS.border}`,
              background: filter === f ? COLORS.navy : "#fff",
              color: filter === f ? "#fff" : COLORS.ink,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f === "verified" ? "paid" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: COLORS.red }}>{error}</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted }}>No matching students.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => {
            const key = `${c.studentId}-${c.month}`;
            const isOpen = openKey === key;
            const st = STATUS_INFO[c.status];
            return (
              <div key={key} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {c.receiptImage && (
                      <img src={`/api/image?key=${c.receiptImage}`} alt="Receipt" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }} />
                    )}
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{c.studentName}</p>
                      <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>
                        {classLabel(c.className)} · {c.section || "-"} · {c.month}
                      </p>
                      {c.receiptPdf && (
                        <a href={`/api/image?key=${c.receiptPdf}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: COLORS.navy }}>
                          View receipt PDF
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {c.status !== "verified" && Number(c.paidAmount) > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#8A5B00", background: "#FCEFD6", padding: "4px 10px", borderRadius: 4 }}>Partly paid</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, color: st?.color, background: st?.bg, padding: "4px 10px", borderRadius: 4 }}>{st?.label}</span>
                    )}
                    {c.status !== "verified" && (
                      <button onClick={() => receivePayment(c)} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}>
                        Receive payment
                      </button>
                    )}
                    {c.payments?.length > 0 && (c.status !== "verified" || c.payments.length > 1) && (
                      <button onClick={() => undoLastPayment(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.ink, borderRadius: 5, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}>
                        Undo last payment
                      </button>
                    )}
                    {c.status !== "verified" && (
                      <button onClick={() => updateStatus(c.studentId, c.month, "verified")} style={{ background: "#27500A", color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}>
                        {Number(c.paidAmount) > 0 ? "Mark balance as Paid" : "Mark as Paid"}
                      </button>
                    )}
                    {c.status === "pending" && (
                      <button onClick={() => updateStatus(c.studentId, c.month, "rejected")} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}>
                        Reject
                      </button>
                    )}
                    {c.status === "verified" && (
                      <button
                        onClick={() => {
                          if (confirm(`Undo payment for ${c.studentName} (${c.month})? This marks the voucher Unpaid again — use this only if it was marked Paid by mistake.`)) {
                            updateStatus(c.studentId, c.month, "unpaid");
                          }
                        }}
                        style={{ background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 5, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}
                      >
                        Undo (Mark Unpaid)
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: COLORS.ink }}>
                    Total: <strong>{rs(c.totalDue)}</strong>
                    {c.items?.arrears > 0 && <span style={{ color: COLORS.red }}> (incl. arrears {rs(c.items.arrears)})</span>}
                  </span>
                  {Number(c.paidAmount) > 0 && (
                    <span style={{ fontSize: 12.5 }}>
                      <span style={{ color: "#15803D", fontWeight: 600 }}>Received {rs(c.paidAmount)}</span>
                      {c.status !== "verified" && <span style={{ color: COLORS.red, fontWeight: 600 }}> · Balance {rs(Math.max(0, (Number(c.totalDue) || 0) - Number(c.paidAmount)))}</span>}
                    </span>
                  )}
                  <button
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    style={{ background: isOpen ? COLORS.navy : "none", border: `1px solid ${isOpen ? COLORS.navy : COLORS.border}`, borderRadius: 5, padding: "5px 12px", fontSize: 11.5, cursor: "pointer", color: isOpen ? "#fff" : COLORS.navy }}
                  >
                    {isOpen ? "Close voucher" : "Open voucher"}
                  </button>
                </div>

                {isOpen && <VoucherEditor challan={c} onSaved={load} />}
              </div>
            );
          })}
        </div>
      )}

      {bulkOpen && (
        <div
          onClick={() => setBulkOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 17, color: COLORS.navy, margin: "0 0 4px" }}>Add fee to many students</p>
            <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 14px" }}>
              Puts an amount into one fee block of this month's vouchers — for example the Annual Fund for the whole school.
            </p>

            <label style={{ fontSize: 12, color: COLORS.muted }}>Fee block</label>
            <select value={bulkField} onChange={(e) => setBulkField(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 12 }}>
              {FEE_ITEMS.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 12, color: COLORS.muted }}>Amount (Rs.)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              placeholder="e.g. 2000"
              style={{ ...inputBase, width: "100%", marginBottom: 12 }}
            />

            <label style={{ fontSize: 12, color: COLORS.muted }}>For</label>
            <select value={bulkClass} onChange={(e) => setBulkClass(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 12 }}>
              <option value="All">All classes (whole school)</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {classLabel(c)}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 12, color: COLORS.muted }}>How</label>
            <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 12 }}>
              <option value="set">Set to exactly this amount (safe to press twice)</option>
              <option value="add">Add on top of what is already there</option>
            </select>

            <p style={{ fontSize: 12.5, color: COLORS.ink, background: COLORS.tint, borderRadius: 6, padding: "8px 10px", margin: "0 0 12px" }}>
              {fieldLabel}: {bulkAmount === "" ? "—" : rs(bulkAmount)} will go into <strong>{bulkTargets.length}</strong> unpaid voucher(s) of {currentMonth()}.
              {bulkPaid > 0 ? ` ${bulkPaid} already-paid voucher(s) will not be changed.` : ""}
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={applyBulk}
                disabled={bulkBusy}
                style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: bulkBusy ? 0.6 : 1 }}
              >
                {bulkBusy ? "Applying..." : "Apply to all"}
              </button>
              <button onClick={() => setBulkOpen(false)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "10px 18px", fontSize: 13, cursor: "pointer" }}>
                Close
              </button>
            </div>
            {bulkMsg && <p style={{ fontSize: 12.5, marginTop: 10, color: bulkMsg.startsWith("Done") ? "#27500A" : COLORS.red }}>{bulkMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
