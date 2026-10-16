"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function InchargeAccountPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/incharge-credentials", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setUsername(d.username);
        setPassword(d.password);
      });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await fetch("/api/incharge-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <AdminShell title="Incharge account">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px", maxWidth: 460 }}>
        The Incharge handles calling parents about absent students. Set their login here — you can
        change it any time.
      </p>
      <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, maxWidth: 400 }}>
        <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 16 }}
        />
        <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 20 }}
        />
        <button type="submit" style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 24px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}>
          {saved ? "Saved" : "Save changes"}
        </button>
      </form>
    </AdminShell>
  );
}
