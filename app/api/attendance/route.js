import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { sendPushToAdmins, sendAttendanceNotificationsToParents } from "../../../lib/push";

export const dynamic = "force-dynamic";

// Attendance is stored as: attendance[className][date] = { studentId: "present" | "absent" | "leave" }

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("class");
  const date = searchParams.get("date");
  const db = await readDB();

  if (className && date) {
    const record = db.attendance?.[className]?.[date] || {};
    return NextResponse.json(record, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(db.attendance || {}, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const { className, date, records } = await req.json();

  try {
    await updateDB((db) => {
      if (!db.attendance) db.attendance = {};
      if (!db.attendance[className]) db.attendance[className] = {};
      db.attendance[className][date] = records;
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not save attendance. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  // Figure out which teacher saved this, from their session cookie, and
  // notify the admin. Each notification runs in its own try/catch so a
  // failure in one never silently blocks the other.
  let teacherName = "A teacher";
  try {
    const cookieValue = cookies().get(SESSION_COOKIE)?.value;
    const session = cookieValue ? readSessionValue(cookieValue) : null;
    if (session) {
      const db = await readDB();
      const teacher = db.teachers.find((t) => t.username === session.username);
      teacherName = teacher?.name || "A teacher";
    }
  } catch (err) {
    // couldn't identify the teacher — still proceed with a generic name
  }

  const label = /^\d+$/.test(className) ? `Class ${className}` : className;

  try {
    await sendPushToAdmins({
      title: "Attendance marked",
      body: `${teacherName} marked attendance for ${label} on ${date}.`,
      url: "/admin/dashboard/attendance",
    });
  } catch (err) {
    // Never fail the attendance save just because a notification couldn't be sent.
  }

  try {
    await sendAttendanceNotificationsToParents(className, date, records);
  } catch (err) {
    // Same — attendance saving must never depend on notifications working.
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
