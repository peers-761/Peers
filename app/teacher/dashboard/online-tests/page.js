"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../../../../lib/theme";
import { testTypeLabel } from "../../../../lib/onlineTestShared";

const PHASE = {
  live: { text: "Test is running", color: "#C8102E" },
  closed: { text: "Ready for checking", color: "#8A5B00" },
  published: { text: "Results sent", color: "#27500A" },
};

export default function TeacherOnlineTestsPage() {
  const [tests, setTests] = useState(null);

  useEffect(() => {
    fetch("/api/online-tests", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTests(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Online tests to check</p>
        <a href="/teacher/dashboard" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>Back</a>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
        {tests === null ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : tests.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>No test has been given to you for checking yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tests.map((t) => {
              const ph = PHASE[t.phase] || PHASE.closed;
              return (
                <a key={t.id} href={`/teacher/dashboard/online-tests/${t.id}`} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px", textDecoration: "none" }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600, color: COLORS.ink, margin: 0 }}>{t.title}</p>
                  <p style={{ fontSize: 12, color: "#9A9A90", margin: "2px 0 6px" }}>{testTypeLabel(t.type)} · Class {t.className}{t.subject ? ` · ${t.subject}` : ""}</p>
                  <p style={{ fontSize: 12.5, margin: 0 }}>
                    <span style={{ color: ph.color, fontWeight: 600 }}>{ph.text}</span>
                    <span style={{ color: COLORS.muted }}> · Checked {t.checked} of {t.enrolled}</span>
                  </p>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
