import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB } from "../../../lib/data";
import { pktDateStr } from "../../../lib/time";
import { isSchoolOffDayForDate } from "../../../lib/attendanceSettings";

export const dynamic = "force-dynamic";

function todayStr() {
  return pktDateStr();
}

// All calendar dates between from..to (inclusive), as YYYY-MM-DD strings.
function dateRange(from, to) {
  const dates = [];
  let cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function GET(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const today = todayStr();
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || today;

  const db = await readDB();
  const teachers = db.teachers || [];
  const attendance = db.teacherAttendance || {};

  // Only count working days up to and including today — never penalize
  // teachers for future dates in the selected range, and skip Sundays /
  // admin-declared holidays entirely.
  const allDates = dateRange(from, to).filter((d) => d <= today);
  const workingDates = allDates.filter((d) => !isSchoolOffDayForDate(db, d));

  const report = teachers.map((teacher) => {
    const records = workingDates.map((date) => {
      const rec = attendance[teacher.username]?.[date];
      return { date, present: !!rec, time: rec?.timestamp || null };
    });
    const presentDays = records.filter((r) => r.present).length;
    const workingDays = workingDates.length;
    const percentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 1000) / 10 : null;

    const todayRecord = attendance[teacher.username]?.[today] || null;

    return {
      username: teacher.username,
      name: teacher.name,
      todayTime: todayRecord?.timestamp || null,
      todayMarked: !!todayRecord,
      presentDays,
      workingDays,
      percentage,
      history: records,
    };
  });

  return NextResponse.json(
    { from, to, workingDays: workingDates.length, teachers: report },
    { headers: { "Cache-Control": "no-store" } }
  );
}
