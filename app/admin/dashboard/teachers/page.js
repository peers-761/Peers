"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import PasswordInput from "../../../../components/PasswordInput";
import { COLORS, CLASSES } from "../../../../lib/theme";

export default function TeachersAdminPage() {
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/teachers", { cache: "no-store" });
    setTeachers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      username: form.username.value.trim(),
      password: form.password.value,
      name: form.name.value.trim(),
      assignedClasses: Array.from(form.querySelectorAll("input[type=checkbox]:checked")).map((el) => el.value),
    };

    if (!payload.username || !payload.password || !payload.name) {
      setError("Fill in name, username, and password.");
      return;
    }

    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add teacher.");
      return;
    }

    setError("");
    form.reset();
    load();
  }

  async function handleDelete(username) {
    await fetch("/api/teachers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    load();
  }

  return (
    <AdminShell title="Teachers">
      <form onSubmit={handleAdd} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <input name="name" placeholder="Full name" style={{ flex: 1, minWidth: 160, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
          <input name="username" placeholder="Username" style={{ flex: 1, minWidth: 140, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <PasswordInput name="password" placeholder="Password" />
          </div>
        </div>

        <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 8px" }}>Assign classes (optional)</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          {CLASSES.map((c) => (
            <label key={c} style={{ fontSize: 12.5, color: COLORS.ink, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" value={c} />
              {c === "PG" ? "PG" : c}
            </label>
          ))}
        </div>

        {error && <p style={{ fontSize: 12, color: COLORS.red, margin: "0 0 12px" }}>{error}</p>}
        <button
          type="submit"
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Add teacher
        </button>
      </form>

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {teachers.map((t, i) => (
          <div key={t.username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            <div>
              <p style={{ fontSize: 13.5, color: COLORS.ink, margin: 0, fontWeight: 500 }}>{t.name}</p>
              <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>
                {t.username} · Classes: {t.assignedClasses?.length ? t.assignedClasses.join(", ") : "All"}
              </p>
            </div>
            <button onClick={() => handleDelete(t.username)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}>
              Remove
            </button>
          </div>
        ))}
        {teachers.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No teachers added yet.</p>}
      </div>
    </AdminShell>
  );
}
