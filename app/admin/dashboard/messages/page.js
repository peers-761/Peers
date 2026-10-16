"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function MessagesAdminPage() {
  const [messages, setMessages] = useState([]);

  async function load() {
    const res = await fetch("/api/contact-submissions", { cache: "no-store" });
    setMessages(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    await fetch("/api/contact-submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <AdminShell title="Contact messages">
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {messages.map((m, i) => (
          <div key={m.id} style={{ padding: "14px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 14, color: COLORS.ink, margin: 0, fontWeight: 500 }}>
                {m.name} {m.phone ? `· ${m.phone}` : ""}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 12, color: "#9A9A90" }}>{new Date(m.date).toLocaleDateString()}</span>
                <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}>
                  Delete
                </button>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>{m.message}</p>
          </div>
        ))}
        {messages.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No messages yet.</p>}
      </div>
    </AdminShell>
  );
}
