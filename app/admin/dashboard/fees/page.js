"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, CLASSES } from "../../../../lib/theme";

export default function FeesAdminPage() {
  const [fees, setFees] = useState({});
  const [saved, setSaved] = useState("");

  async function load() {
    const res = await fetch("/api/fees", { cache: "no-store" });
    setFees(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(className) {
    await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ className, amount: fees[className] }),
    });
    setSaved(className);
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <AdminShell title="Fee structure">
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", background: COLORS.tint, padding: "10px 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Class</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Monthly fee (Rs.)</span>
          <span />
        </div>
        {CLASSES.map((c, i) => (
          <div key={c} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", alignItems: "center", padding: "10px 20px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 13.5, color: COLORS.ink }}>{/^\d+$/.test(c) ? `Class ${c}` : c}</span>
            <input
              type="number"
              value={fees[c] ?? ""}
              onChange={(e) => setFees((prev) => ({ ...prev, [c]: e.target.value }))}
              style={{ width: 120, padding: "7px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
            />
            <button
              onClick={() => handleSave(c)}
              style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}
            >
              {saved === c ? "Saved" : "Save"}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
