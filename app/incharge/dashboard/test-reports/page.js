"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, CLASSES } from "../../../../lib/theme";
import TestReportForm from "../../../../components/TestReportForm";
import TestReportsList from "../../../../components/TestReportsList";

function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

const sel = { padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 };

export default function InchargeTestReportsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("new"); // "new" | "list"
  const [className, setClassName] = useState(CLASSES[0]);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    fetch("/api/students", { cache: "no-store" })
      .then((r) => r.json())
      .then((all) => {
        const list = all?.[className] || [];
        setStudents(list);
        setStudentId(list[0]?.id || "");
      });
  }, [className]);

  const student = students.find((s) => s.id === studentId);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/incharge");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Test Reports</p>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/incharge/dashboard" style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, textDecoration: "none" }}>Back</a>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab("new")} style={{ ...sel, background: tab === "new" ? COLORS.navy : "#fff", color: tab === "new" ? "#fff" : COLORS.ink, cursor: "pointer" }}>
            + New report
          </button>
          <button onClick={() => setTab("list")} style={{ ...sel, background: tab === "list" ? COLORS.navy : "#fff", color: tab === "list" ? "#fff" : COLORS.ink, cursor: "pointer" }}>
            All reports
          </button>
        </div>

        {tab === "new" ? (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
              <select style={sel} value={className} onChange={(e) => setClassName(e.target.value)}>
                {CLASSES.map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
              </select>
              <select style={sel} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {students.length === 0 && <option value="">No students in this class</option>}
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {student ? (
              <TestReportForm
                key={studentId}
                className={className}
                studentId={studentId}
                studentName={student.name}
                preparedByRole="incharge"
                backHref="/incharge/dashboard/test-reports"
                backLabel="Back to Test Reports"
              />
            ) : (
              <p style={{ fontSize: 13, color: COLORS.muted }}>Choose a class with students in it.</p>
            )}
          </>
        ) : (
          <TestReportsList showClassFilter />
        )}
      </div>
    </div>
  );
}
