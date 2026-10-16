"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function BankDetailsPage() {
  const [details, setDetails] = useState({ bankName: "", accountTitle: "", iban: "", jazzcash: "", easypaisa: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/bank-details", { cache: "no-store" })
      .then((r) => r.json())
      .then(setDetails);
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await fetch("/api/bank-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const fields = [
    { key: "bankName", label: "Bank Name" },
    { key: "accountTitle", label: "Account Title" },
    { key: "iban", label: "IBAN" },
    { key: "jazzcash", label: "JazzCash Number" },
    { key: "easypaisa", label: "Easypaisa Number" },
  ];

  return (
    <AdminShell title="Bank Details">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px", maxWidth: 460 }}>
        This is shown to parents on their Fee Challan, under "Online Payment."
      </p>
      <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, maxWidth: 420 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>{f.label}</label>
            <input
              value={details[f.key] || ""}
              onChange={(e) => setDetails((prev) => ({ ...prev, [f.key]: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
            />
          </div>
        ))}
        <button type="submit" style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 24px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>
          {saved ? "Saved" : "Save changes"}
        </button>
      </form>
    </AdminShell>
  );
}
