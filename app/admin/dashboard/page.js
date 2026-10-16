import AdminShell from "../../../components/AdminShell";
import NotificationSetup from "../../../components/NotificationSetup";
import { COLORS } from "../../../lib/theme";
import { readDB } from "../../../lib/data";
import { buildRevenue, classLabel } from "../../../lib/revenue";
import { CLASSES } from "../../../lib/theme";
import { pktDateStr, pktMonthStr, pktHour, pktDateLabel } from "../../../lib/time";
import AnimatedUnderline from "../../../components/AnimatedUnderline";

export const dynamic = "force-dynamic";

const rs = (n) => `Rs. ${Math.round(n || 0).toLocaleString("en-PK")}`;

function greeting() {
  const h = pktHour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---- small, consistent-stroke icon set (no external icon library) ----
function Icon({ path, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
const ICONS = {
  students: <><path d="M12 3 2 8l10 5 10-5-10-5Z" /><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" /></>,
  teachers: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>,
  classes: <><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-6h6v6" /><path d="M4 11h16" /></>,
  attendance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="m8 15 2.5 2.5L16 12" /></>,
  revenue: <><path d="M12 2v20" /><path d="M17 6.5c0-1.9-2.2-3.5-5-3.5S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" /></>,
  fees: <><rect x="2.5" y="6" width="19" height="13" rx="2" /><circle cx="12" cy="12.5" r="3" /><path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></>,
  inbox: <><path d="M3 12h4l2 3h6l2-3h4" /><path d="M5.5 5h13l2.5 7v7a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-7l2.5-7Z" /></>,
  notices: <><path d="M4 19V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v11l-3-2-3 2-3-2-3 2-3-2Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M8 2.5v4M16 2.5v4M3 9.5h18" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.8-1l-.3-2.5H9l-.3 2.5a7.5 7.5 0 0 0-1.8 1l-2.3-.9-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.8 1l.3 2.5h6l.3-2.5c.7-.2 1.3-.6 1.8-1l2.3.9 2-3.4-2-1.5Z" /></>,
  test: <><path d="M9 2h6v4l3 3v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9l3-3V2Z" /><path d="M9 14h6M9 17h4" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};
// Simple flexbox stacked bar — Present / Absent / Leave, no chart library needed.
function StackedBar({ present, absent, leave, height = 12 }) {
  const total = present + absent + leave;
  if (total === 0) {
    return <div style={{ height, borderRadius: 999, background: COLORS.tint }} />;
  }
  return (
    <div style={{ display: "flex", width: "100%", height, borderRadius: 999, overflow: "hidden", background: COLORS.tint }}>
      {present > 0 && <div style={{ width: `${(present / total) * 100}%`, background: "#22C55E" }} />}
      {absent > 0 && <div style={{ width: `${(absent / total) * 100}%`, background: COLORS.red }} />}
      {leave > 0 && <div style={{ width: `${(leave / total) * 100}%`, background: COLORS.gold }} />}
    </div>
  );
}

function IconBadge({ name, bg, fg }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon path={ICONS[name]} />
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/admin/dashboard/students", label: "Students", icon: "students", bg: "#EAF0FF", fg: COLORS.navy },
  { href: "/admin/dashboard/teachers", label: "Teachers", icon: "teachers", bg: "#FCEFD6", fg: "#8A5B00" },
  { href: "/admin/dashboard/fee-verification", label: "Fee Verification", icon: "fees", bg: "#EAF3DE", fg: "#27500A" },
  { href: "/admin/dashboard/revenue", label: "Revenue Analysis", icon: "revenue", bg: "#FCEBEB", fg: COLORS.red },
  { href: "/admin/dashboard/online-tests", label: "Online Tests", icon: "test", bg: "#EEE9FB", fg: "#4C2A9A" },
  { href: "/admin/dashboard/attendance", label: "Attendance Records", icon: "attendance", bg: "#E4F6F4", fg: "#0E6C64" },
  { href: "/admin/dashboard/notices", label: "Notices", icon: "notices", bg: "#FFF1E6", fg: "#B5540C" },
  { href: "/admin/dashboard/admissions", label: "Admission Inquiries", icon: "inbox", bg: "#EAF0FF", fg: COLORS.navy },
  { href: "/admin/dashboard/calendar", label: "Calendar", icon: "calendar", bg: "#FCEFD6", fg: "#8A5B00" },
  { href: "/admin/dashboard/settings", label: "Contact Settings", icon: "gear", bg: "#F1F1EC", fg: COLORS.muted },
];

export default async function AdminOverviewPage() {
  const db = await readDB();
  const today = pktDateStr();
  const month = pktMonthStr();
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));

  const totalStudents = Object.values(db.students || {}).reduce((sum, arr) => sum + arr.length, 0);
  const totalTeachers = (db.teachers || []).length;
  const totalClasses = Object.keys(db.students || {}).length;

  // Today's student attendance — per class (so the Overview can show a
  // class-wise average and, on click, exactly who's absent/on leave) and
  // summed up for the school-wide totals.
  const classStats = CLASSES.filter((c) => (db.students?.[c] || []).length > 0).map((cls) => {
    const studentsInClass = db.students?.[cls] || [];
    const rec = db.attendance?.[cls]?.[today] || {};
    let p = 0, a = 0, l = 0;
    const absentList = [];
    const leaveList = [];
    for (const s of studentsInClass) {
      const status = rec[s.id];
      if (status === "present") p++;
      else if (status === "absent") { a++; absentList.push(s); }
      else if (status === "leave") { l++; leaveList.push(s); }
    }
    const marked = p + a + l;
    return {
      className: cls, label: classLabel(cls), total: studentsInClass.length,
      present: p, absent: a, leave: l, marked,
      avg: marked > 0 ? Math.round((p / marked) * 100) : null,
      absentList, leaveList,
    };
  });

  const present = classStats.reduce((t, c) => t + c.present, 0);
  const absent = classStats.reduce((t, c) => t + c.absent, 0);
  const leave = classStats.reduce((t, c) => t + c.leave, 0);
  const markedToday = present + absent + leave;
  const attendancePct = markedToday > 0 ? Math.round((present / markedToday) * 100) : null;

  // Today's teacher attendance.
  const teachersPresentToday = (db.teachers || []).filter((t) => db.teacherAttendance?.[t.username]?.[today]).length;

  // This month's revenue (collected so far) via the same engine as Revenue Analysis.
  let collectedThisMonth = 0;
  try {
    const rev = buildRevenue(db, year, monthNum);
    collectedThisMonth = rev.classes.reduce((t, c) => t + c.collected, 0);
  } catch {
    collectedThisMonth = 0;
  }

  // Fee vouchers currently waiting on office review.
  let pendingFees = 0;
  for (const months of Object.values(db.feeChallans || {})) {
    if (months?.[month]?.status === "pending") pendingFees++;
  }

  const inquiries = (db.admissionInquiries || []).length + (db.contactMessages || []).length;

  const kpis = [
    { label: "Total Students", value: totalStudents, icon: "students", bg: "#EAF0FF", fg: COLORS.navy },
    { label: "Total Teachers", value: totalTeachers, icon: "teachers", bg: "#FCEFD6", fg: "#8A5B00" },
    { label: "Classes Running", value: totalClasses, icon: "classes", bg: "#EEE9FB", fg: "#4C2A9A" },
    {
      label: "Today's Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "—",
      sub: markedToday > 0 ? `${present} present · ${absent} absent${leave ? ` · ${leave} leave` : ""}` : "Not marked yet",
      icon: "attendance", bg: "#E4F6F4", fg: "#0E6C64",
    },
    {
      label: "Teacher Attendance Today",
      value: `${teachersPresentToday}/${totalTeachers}`,
      icon: "teachers", bg: "#FFF1E6", fg: "#B5540C",
    },
    { label: "Revenue This Month", value: rs(collectedThisMonth), icon: "revenue", bg: "#EAF3DE", fg: "#27500A" },
    { label: "Fee Vouchers Pending Review", value: pendingFees, icon: "fees", bg: "#FCEBEB", fg: COLORS.red },
    { label: "Admissions + Messages", value: inquiries, icon: "inbox", bg: "#EAF0FF", fg: COLORS.navy },
  ];

  return (
    <AdminShell title="Overview">
      <NotificationSetup />

      {/* ---- Hero banner ---- */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyDark} 100%)`,
          borderRadius: 16,
          padding: "30px 32px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(240,165,0,0.12)" }} />
        <div style={{ position: "absolute", bottom: -80, right: 120, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div className="hero-fade" style={{ display: "flex", alignItems: "center", gap: 20, position: "relative", zIndex: 1, animationDelay: "0s" }}>
          {/* No background box — the PNG is already transparent, just a soft
              glow (not a solid background) so it still reads clearly against navy. */}
          <img
            src="/logo-full.png"
            alt="The PEERS Education System"
            style={{ height: 72, width: "auto", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.25))" }}
          />
          <div>
            <p style={{ margin: 0, color: "#C6CBE0", fontSize: 13 }}>{greeting()}, Admin</p>
            <p style={{ margin: "2px 0 0", color: "#fff", fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 22 }}>THE PEERS EDUCATION SYSTEM</p>
            <p style={{ margin: "5px 0 0", color: COLORS.gold, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13.5, letterSpacing: 0.3 }}>We Take You Along</p>
            <AnimatedUnderline color={COLORS.gold} width={130} />
            <p style={{ margin: "8px 0 0", color: "#8B94C4", fontSize: 12.5 }}>{pktDateLabel()} · School Management Overview</p>
          </div>
        </div>
        <div className="hero-fade" style={{ position: "relative", zIndex: 1, textAlign: "right", animationDelay: "0.15s" }}>
          <p style={{ margin: 0, color: "#C6CBE0", fontSize: 12 }}>This month&rsquo;s collection</p>
          <p style={{ margin: "2px 0 0", color: COLORS.gold, fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 26 }}>{rs(collectedThisMonth)}</p>
        </div>
      </div>

      {/* ---- KPI grid ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {kpis.map((c) => (
          <div
            key={c.label}
            style={{
              background: "#fff",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 1px 3px rgba(22,33,94,0.05)",
            }}
          >
            <IconBadge name={c.icon} bg={c.bg} fg={c.fg} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11.5, color: COLORS.muted, margin: "0 0 4px", whiteSpace: "nowrap" }}>{c.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.navy, margin: 0, lineHeight: 1.1 }}>{c.value}</p>
              {c.sub && <p style={{ fontSize: 10.5, color: COLORS.muted, margin: "3px 0 0" }}>{c.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ---- Today's Attendance: overall + class-wise, click a class to see who's absent ---- */}
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, color: COLORS.navy, margin: 0 }}>Today&rsquo;s Attendance</p>
          <span style={{ fontSize: 12, color: COLORS.muted }}>{pktDateLabel()}</span>
        </div>

        {markedToday === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>No attendance has been marked by any class yet today.</p>
        ) : (
          <>
            {/* Overall */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 14, marginBottom: 14 }}>
              <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Present</p><p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#15803D" }}>{present}</p></div>
              <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Absent</p><p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.red }}>{absent}</p></div>
              <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Leave</p><p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#B5540C" }}>{leave}</p></div>
              <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Total Marked</p><p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.ink }}>{markedToday}</p></div>
              <div><p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.muted }}>Overall Average</p><p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.navy }}>{attendancePct}%</p></div>
            </div>
            <StackedBar present={present} absent={absent} leave={leave} height={16} />
            <div style={{ display: "flex", gap: 16, marginTop: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: COLORS.muted }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#22C55E", marginRight: 5 }} />Present</span>
              <span style={{ fontSize: 11, color: COLORS.muted }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COLORS.red, marginRight: 5 }} />Absent</span>
              <span style={{ fontSize: 11, color: COLORS.muted }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: COLORS.gold, marginRight: 5 }} />Leave</span>
            </div>

            {/* Class-wise — click a class to see exactly who's absent/on leave */}
            <p style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.navy, margin: "0 0 10px" }}>Class-wise</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {classStats.map((c) => (
                <details key={c.className} className="attendance-row">
                  <summary>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, width: 90, flexShrink: 0 }}>{c.label}</span>
                    <span style={{ flex: 1, minWidth: 80 }}><StackedBar present={c.present} absent={c.absent} leave={c.leave} /></span>
                    <span style={{ fontSize: 11.5, color: COLORS.muted, width: 150, flexShrink: 0, textAlign: "right" }}>
                      {c.marked > 0 ? `${c.present}P · ${c.absent}A${c.leave ? ` · ${c.leave}L` : ""}` : "Not marked"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.avg === null ? COLORS.muted : c.avg >= 90 ? "#15803D" : c.avg >= 75 ? COLORS.gold : COLORS.red, width: 48, flexShrink: 0, textAlign: "right" }}>
                      {c.avg === null ? "—" : `${c.avg}%`}
                    </span>
                    <span className="chevron" style={{ color: COLORS.muted, flexShrink: 0 }}><Icon path={ICONS.arrow} size={14} /></span>
                  </summary>
                  <div style={{ padding: "12px 4px 4px 98px" }}>
                    {c.absentList.length === 0 && c.leaveList.length === 0 ? (
                      <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>Nobody absent or on leave in this class today. 🎉</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 32px" }}>
                        {c.absentList.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.red, margin: "0 0 6px" }}>Absent ({c.absentList.length})</p>
                            {c.absentList.map((s) => (
                              <p key={s.id} style={{ fontSize: 12.5, color: COLORS.ink, margin: "0 0 4px" }}>
                                {s.name}{s.parentPhone ? <a href={`tel:${s.parentPhone}`} style={{ marginLeft: 8, color: COLORS.navy, fontSize: 11 }}>📞 {s.parentPhone}</a> : null}
                              </p>
                            ))}
                          </div>
                        )}
                        {c.leaveList.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: "#B5540C", margin: "0 0 6px" }}>Leave ({c.leaveList.length})</p>
                            {c.leaveList.map((s) => (
                              <p key={s.id} style={{ fontSize: 12.5, color: COLORS.ink, margin: "0 0 4px" }}>{s.name}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- Quick actions ---- */}
      <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, color: COLORS.navy, margin: "0 0 14px" }}>Quick Actions</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
        {QUICK_LINKS.map((q) => (
          <a
            key={q.href}
            href={q.href}
            className="qa-card"
            style={{
              background: "#fff",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "18px 16px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
            }}
          >
            <IconBadge name={q.icon} bg={q.bg} fg={q.fg} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{q.label}</span>
              <span style={{ color: COLORS.muted }}><Icon path={ICONS.arrow} size={15} /></span>
            </div>
          </a>
        ))}
      </div>

      <style>{`
        .qa-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(22,33,94,0.12);
          border-color: ${COLORS.navy} !important;
        }
        .attendance-row summary {
          list-style: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: ${COLORS.tint};
        }
        .attendance-row summary::-webkit-details-marker { display: none; }
        .attendance-row summary:hover { background: #EDEEE5; }
        .attendance-row .chevron { transition: transform 0.15s ease; }
        .attendance-row[open] .chevron { transform: rotate(90deg); }
        .attendance-row[open] summary { border-radius: 8px 8px 0 0; }

        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade { animation: heroFadeUp 0.6s ease both; }
      `}</style>
    </AdminShell>
  );
}
