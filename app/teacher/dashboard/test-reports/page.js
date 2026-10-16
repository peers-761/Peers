"use client";

import { COLORS } from "../../../../lib/theme";
import TestReportsList from "../../../../components/TestReportsList";

export default function TeacherTestReportsPage() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Test Reports</p>
        <a href="/teacher/dashboard" style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>
          Back
        </a>
      </div>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 16px" }}>
          Every test report for your classes stays here, whether or not it was pushed to the Parent Portal. A report
          sent to a parent auto-expires from their portal after 30 days, but your own copy here is never deleted
          automatically — delete it yourself with the Delete button on any row whenever you want.
        </p>
        <TestReportsList showClassFilter={false} />
      </div>
    </div>
  );
}
