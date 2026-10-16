"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

const FIELDS = [
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone number" },
  { key: "whatsapp", label: "WhatsApp number" },
  { key: "email", label: "Email" },
];

const TIME_FIELDS = [
  { key: "attendanceStartTime", label: "Attendance window opens at" },
  { key: "attendanceHardCutoff", label: "Absolute last time to mark attendance" },
];

const box = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, maxWidth: 620, marginBottom: 24 };
const labelStyle = { display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 };
const btnStyle = { background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 24px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" };

export default function SettingsAdminPage() {
  const [settings, setSettings] = useState({});
  const [attendance, setAttendance] = useState({});
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        setSettings(s);
        setAttendance(s.attendance || {});
      });
  }, []);

  async function saveAll(next) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const updated = await res.json();
    setSettings(updated);
    return updated;
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    await saveAll(settings);
    setSaved("contact");
    setTimeout(() => setSaved(""), 1500);
  }

  async function handleSaveTimings(e) {
    e.preventDefault();
    await saveAll({ attendance });
    setSaved("timings");
    setTimeout(() => setSaved(""), 1500);
  }



  return (
    <AdminShell title="Settings">
      <form onSubmit={handleSaveContact} style={box}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Contact settings</h3>
        {FIELDS.map((f) => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{f.label}</label>
            <input
              value={settings[f.key] || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}
        <button type="submit" style={btnStyle}>{saved === "contact" ? "Saved" : "Save changes"}</button>
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 16, marginBottom: 0 }}>
          This information appears on the public Contact page and in the website footer.
        </p>
      </form>

      <form onSubmit={handleSaveTimings} style={box}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Teacher attendance timings</h3>
        {TIME_FIELDS.map((f) => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type="time"
              value={attendance[f.key] || ""}
              onChange={(e) => setAttendance((prev) => ({ ...prev, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Stop running absence checks after this hour (24h, e.g. 14)</label>
          <input
            type="number"
            min="0"
            max="23"
            value={attendance.escalationWindowEndHour ?? ""}
            onChange={(e) => setAttendance((prev) => ({ ...prev, escalationWindowEndHour: Number(e.target.value) }))}
            style={inputStyle}
          />
        </div>
        <button type="submit" style={btnStyle}>{saved === "timings" ? "Saved" : "Save timings"}</button>
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 16, marginBottom: 0 }}>
          Simple by design: a teacher can mark attendance any time in this window. If they haven't marked
          by the cutoff time, you'll get one "absent" notification with the exact date — no popups.
        </p>
      </form>

      <div style={box}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Holiday calendar</h3>
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: -8, marginBottom: 14 }}>
          Sundays are skipped automatically. Mark any other holidays, festivals, or lockdown days on the
          calendar so teachers are never marked absent — and the admin never gets an "absent" notification —
          on those dates.
        </p>
        <a
          href="/admin/dashboard/calendar"
          style={{ display: "inline-block", background: COLORS.navy, color: "#fff", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
        >
          Open Calendar
        </a>
      </div>
    </AdminShell>
  );
}
