"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, CLASSES } from "../../../lib/theme";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("");
  const [allowedClasses, setAllowedClasses] = useState(CLASSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher-me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setTeacherName(data.name);
        if (data.assignedClasses && data.assignedClasses.length > 0) {
          setAllowedClasses(data.assignedClasses);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/teacher");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>
          Teacher dashboard{teacherName ? ` — ${teacherName}` : ""}
        </p>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 14px", borderRadius: 5, fontSize: 12.5, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 20, color: COLORS.navy, margin: "0 0 6px" }}>
          What do you want to do?
        </p>
        <p style={{ fontSize: 13.5, color: COLORS.muted, margin: "0 0 20px" }}>
          Open reports and tests below, or pick a class at the bottom to mark today's attendance.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, margin: "0 0 28px" }}>
          {[
            { href: "/teacher/dashboard/online-tests", title: "Online tests to check", text: "Check papers of tests you were assigned", primary: true },
            { href: "/teacher/dashboard/test-reports", title: "Test Reports", text: "See, send to parents, or delete every student report of your classes" },
            { href: "/teacher/dashboard/monthly-reports", title: "Monthly Test Reports", text: "Prepare the whole-class monthly sheet, print / PDF, or delete it" },
          ].map((c) => (
            <a key={c.href} href={c.href} style={{ display: "block", textDecoration: "none", background: c.primary ? COLORS.red : "#fff", color: c.primary ? "#fff" : COLORS.navy, border: `1px solid ${c.primary ? COLORS.red : COLORS.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{c.title}</span>
              <span style={{ display: "block", fontSize: 12, marginTop: 4, opacity: c.primary ? 0.9 : 0.75, color: c.primary ? "#fff" : COLORS.muted }}>{c.text}</span>
            </a>
          ))}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>Attendance — choose a class</p>
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
            {allowedClasses.map((c) => (
              <button
                key={c}
                onClick={() => router.push(`/teacher/dashboard/${c}`)}
                style={{
                  background: "#fff",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: "18px 0",
                  fontSize: 14,
                  fontWeight: 500,
                  color: COLORS.navy,
                  cursor: "pointer",
                }}
              >
                {/^\d+$/.test(c) ? `Class ${c}` : c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
