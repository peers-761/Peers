"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function AdmissionsAdminPage() {
  const [inquiries, setInquiries] = useState([]);

  async function load() {
    const res = await fetch("/api/admissions", { cache: "no-store" });
    setInquiries(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    await fetch("/api/admissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <AdminShell title="Admission inquiries">
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {inquiries.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`, flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontSize: 14, color: COLORS.ink, margin: 0, fontWeight: 500 }}>{a.childName}</p>
              <p style={{ fontSize: 12.5, color: COLORS.muted, margin: 0 }}>
                {/^\d+$/.test(a.className) ? `Class ${a.className}` : a.className} · {a.phone}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 12, color: "#9A9A90" }}>{new Date(a.date).toLocaleDateString()}</span>
              <button onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {inquiries.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No admission inquiries yet.</p>}
      </div>
    </AdminShell>
  );
}
