"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { COLORS } from "../lib/theme";

const LINKS = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/dashboard/notices", label: "Notices" },
  { href: "/admin/dashboard/achievements", label: "Achievements" },
  { href: "/admin/dashboard/fees", label: "Fee structure" },
  { href: "/admin/dashboard/revenue", label: "Revenue Analysis" },
  { href: "/admin/dashboard/students", label: "Students" },
  { href: "/admin/dashboard/monthly-reports", label: "Monthly Test Reports" },
  { href: "/admin/dashboard/teachers", label: "Teachers" },
  { href: "/admin/dashboard/calendar", label: "Calendar" },
  { href: "/admin/dashboard/attendance", label: "Attendance records" },
  { href: "/admin/dashboard/teacher-attendance", label: "Teacher Attendance" },
  { href: "/admin/dashboard/admissions", label: "Admission inquiries" },
  { href: "/admin/dashboard/messages", label: "Contact messages" },
  { href: "/admin/dashboard/settings", label: "Contact settings" },
  { href: "/admin/dashboard/incharge-account", label: "Incharge account" },
  { href: "/admin/dashboard/absence-reasons", label: "Absence Reasons" },
  { href: "/admin/dashboard/notification-diagnostics", label: "Notification Diagnostics" },
  { href: "/admin/dashboard/fee-verification", label: "Fee Verification" },
  { href: "/admin/dashboard/bank-details", label: "Bank Details" },
  { href: "/admin/dashboard/online-tests", label: "Online Tests" },
];

export default function AdminShell({ title, children }) {
  const router = useRouter();
  const pathname = usePathname();

  // This device may be signed out if 5 other devices are already signed in.
  useEffect(() => {
    let stopped = false;
    async function check() {
      try {
        const res = await fetch("/api/admin-session", { cache: "no-store" });
        if (!stopped && res.status === 401) window.location.href = "/admin?signedOut=1";
      } catch {
        // offline — try again next time
      }
    }
    const t = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint, display: "flex" }}>
      <aside className="no-print" style={{ width: 220, background: COLORS.navy, flexShrink: 0, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 15, margin: "0 0 24px", paddingLeft: 8 }}>
          PEERS Admin
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                style={{
                  fontSize: 13.5,
                  color: active ? "#fff" : "#C6CBE0",
                  textDecoration: "none",
                  padding: "9px 10px",
                  borderRadius: 5,
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                }}
              >
                {l.label}
              </a>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "8px 10px", borderRadius: 5, fontSize: 12.5, cursor: "pointer" }}
        >
          Sign out
        </button>
      </aside>

      <main style={{ flex: 1, padding: "32px 36px" }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 21, color: COLORS.navy, margin: "0 0 24px" }}>
          {title}
        </p>
        {children}
      </main>
    </div>
  );
}
