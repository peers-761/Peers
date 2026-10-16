"use client";

import { useParams } from "next/navigation";
import { COLORS } from "../../../../../../lib/theme";
import TestReportForm from "../../../../../../components/TestReportForm";

export default function EnterResultPage() {
  const { className, studentId } = useParams();

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Enter Test Result
        </p>
        <a href={`/teacher/dashboard/${className}`} style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>
          Back
        </a>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
        <TestReportForm
          className={className}
          studentId={studentId}
          preparedByRole="teacher"
          backHref={`/teacher/dashboard/${className}`}
          backLabel="Back to attendance"
        />
      </div>
    </div>
  );
}
