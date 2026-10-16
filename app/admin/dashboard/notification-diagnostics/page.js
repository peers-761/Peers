"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";

export default function NotificationDiagnosticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/notification-diagnostics", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <AdminShell title="Notification Diagnostics"><p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p></AdminShell>;

  return (
    <AdminShell title="Notification Diagnostics">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px" }}>
        This page shows exactly what's stored, to help find why notifications might not be arriving.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Total devices</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{data.total}</p>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Valid</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#27500A", margin: 0 }}>{data.valid}</p>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Malformed</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.red, margin: 0 }}>{data.malformed}</p>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "0 0 4px" }}>Admin devices</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.navy, margin: 0 }}>{data.byRole.admin}</p>
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>By role</p>
      <p style={{ fontSize: 13, color: COLORS.ink, marginBottom: 20 }}>
        Admin: {data.byRole.admin} · Teacher: {data.byRole.teacher} · Parent: {data.byRole.parent} · Other/missing: {data.byRole.other}
      </p>

      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>All registered devices</p>
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {data.entries.map((e, i) => (
          <div key={i} style={{ padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`, fontSize: 12.5 }}>
            <strong>{e.role}</strong>{e.studentId ? ` (student: ${e.studentId})` : ""} — {e.hasValidEndpoint ? "✓ valid" : "✗ malformed"}
            {e.endpointPreview && <div style={{ color: "#9A9A90", fontSize: 11, marginTop: 2 }}>{e.endpointPreview}</div>}
          </div>
        ))}
        {data.entries.length === 0 && <p style={{ padding: 16, fontSize: 13, color: COLORS.muted, margin: 0 }}>No devices have enabled notifications yet.</p>}
      </div>
    </AdminShell>
  );
}
