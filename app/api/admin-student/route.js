import { NextResponse } from "next/server";
import { readDB, updateDB, docList } from "../../../lib/data";
import { requireAdmin } from "../../../lib/monthlyAuth";
import { getOrCreateChallan, currentMonth, FEE_ITEMS } from "../../../lib/feeChallan";
import { rowsForStudent, autoRemarks } from "../../../lib/monthlyTests";
import { listTests, getAttempt } from "../../../lib/onlineTests";
import { computeResult, alertCounts } from "../../../lib/onlineTestShared";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// GET ?q=name        -> search every student in the school (name, father, roll no / login ID)
// GET ?id=X&class=Y  -> everything about one student: details, current fee voucher,
//                       attendance summary, test reports, monthly tests, auto remarks
export async function GET(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const id = searchParams.get("id");
  const className = searchParams.get("class");

  if (!id) {
    const db = await readDB();
    const out = [];
    for (const [cls, list] of Object.entries(db.students || {})) {
      for (const s of list) {
        const hay = `${s.name} ${s.fatherName || ""} ${s.id} ${s.rollNo || ""}`.toLowerCase();
        if (!q || hay.includes(q)) out.push({ id: s.id, name: s.name, fatherName: s.fatherName || "", rollNo: s.rollNo || "", section: s.section || "Boys", className: cls });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(out.slice(0, 100), { headers: NO_STORE });
  }

  try {
    // Creating/refreshing the voucher may write, so use updateDB.
    const { student, challan, attendance, testResults } = await updateDB((db) => {
      const student = (db.students?.[className] || []).find((s) => s.id === id);
      if (!student) return { student: null };
      const { challan } = getOrCreateChallan(db, className, id, student);
      const attendance = Object.entries(db.attendance?.[className] || {})
        .filter(([, rec]) => rec[id])
        .map(([date, rec]) => ({ date, status: rec[id] }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      const testResults = (db.testResults?.[id] || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { student: { ...student }, challan: JSON.parse(JSON.stringify(challan)), attendance, testResults };
    });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404, headers: NO_STORE });

    const monthly = (await docList("monthly:")).map((d) => d.value).filter(Boolean);
    const monthlyRows = rowsForStudent(monthly, id);

    // Every online test this student took (newest first) — the admin can open
    // the complete paper-by-paper report of each from the student profile.
    let onlineTests = [];
    try {
      const tests = (await listTests()).filter((t) => t.className === className && t.status !== "draft");
      for (const t of tests) {
        const att = await getAttempt(t.id, id);
        if (!att) continue;
        const res = computeResult(t, att);
        const alerts = Object.values(alertCounts(att.flags)).reduce((x, y) => x + y, 0);
        onlineTests.push({
          testId: t.id,
          title: t.title,
          subject: t.subject || "",
          startedAt: t.startedAt || t.createdAt,
          status: t.status,
          checked: !!att.checkedAt,
          obtained: res.obtained,
          outOf: res.outOf,
          percentage: res.percentage,
          grade: res.grade,
          alerts,
        });
      }
      onlineTests.sort((a, b) => ((a.startedAt || "") < (b.startedAt || "") ? 1 : -1));
    } catch (e) {
      onlineTests = [];
    }

    const present = attendance.filter((a) => a.status === "present").length;
    const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : null;

    // Merge the monthly-test rows and the older per-student reports into one list.
    const merged = [
      ...monthlyRows.map((r) => ({ percentage: r.percentage, title: r.title, subjects: r.subjects, createdAt: r.createdAt })),
      ...testResults.map((r) => ({
        percentage: Math.round(r.percentage || 0),
        title: r.testName || "Test",
        createdAt: r.createdAt,
        subjects: Object.entries(r.subjects || {}).map(([name, v]) => ({ name, total: Number(v.total) || 0, obtained: Number(v.obtained) || 0 })),
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const remarks = autoRemarks({ name: student.name, rows: merged, attendancePct });
    // Shown under the remarks so it's visible (not just true) that both
    // report types feed into it — Monthly Test Reports (PTM-style, class
    // tables the Admin fills) and Test Session Reports (prepared by
    // Teacher/Incharge, pushed to the Parent Portal).
    const remarksSources = { monthlyTestReports: monthlyRows.length, testSessionReports: testResults.length };

    return NextResponse.json(
      {
        student: { id: student.id, name: student.name, fatherName: student.fatherName || "", rollNo: student.rollNo || "", section: student.section || "Boys", parentPhone: student.parentPhone || "", parentPassword: student.parentPassword || "", className },
        challan,
        month: currentMonth(),
        feeItems: FEE_ITEMS,
        attendance: { total: attendance.length, present, absent: attendance.filter((a) => a.status === "absent").length, leave: attendance.filter((a) => a.status === "leave").length, pct: attendancePct, recent: attendance.slice(0, 30) },
        testResults,
        onlineTests,
        monthlyRows,
        remarks,
        remarksSources,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not load the student." }, { status: 500, headers: NO_STORE });
  }
}
