import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { pktDateStr } from "../../../lib/time";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || pktDateStr();
    const db = await readDB();
    const remarks = Array.isArray(db.absenceRemarks) ? db.absenceRemarks : [];
    const result = [];

    for (const [className, dates] of Object.entries(db.attendance || {})) {
      const records = dates?.[date];
      if (!records) continue;
      for (const [studentId, status] of Object.entries(records)) {
        if (status !== "absent") continue;
        const student = ((db.students || {})[className] || []).find((s) => s.id === studentId);
        if (!student) continue;
        const remark = remarks.find((r) => r.studentId === studentId && r.date === date);
        result.push({
          studentId,
          studentName: student.name,
          fatherName: student.fatherName || "",
          className,
          section: student.section === "Girls" ? "Girls" : "Boys",
          parentPhone: student.parentPhone || "",
          reasonSubmitted: !!remark,
          reason: remark?.reason || "",
        });
      }
    }

    // Reasons submitted for this date, with class and Boys/Girls, so the
    // incharge screen can filter them exactly like the absentee list.
    const reasons = remarks
      .filter((r) => r.date === date)
      .map((r) => {
        const st = ((db.students || {})[r.className] || []).find((s) => s.id === r.studentId);
        return {
          id: r.id,
          studentId: r.studentId,
          studentName: r.studentName || st?.name || "Unknown",
          className: r.className,
          section: st?.section === "Girls" ? "Girls" : "Boys",
          date: r.date,
          reason: r.reason,
          remarks: r.remarks || "",
        };
      });

    return NextResponse.json({ date, absentees: result, reasons }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not load absentees." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
