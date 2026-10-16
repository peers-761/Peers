import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { isWithinSchoolGeofence, distanceInMeters, SCHOOL_LAT, SCHOOL_LNG } from "../../../lib/geofence";
import { sendPushToAdmins } from "../../../lib/push";
import { pktDateStr, pktTimeLabel, pktDateLabel } from "../../../lib/time";
import { getAttendanceSettings, attendanceStartMinutes, attendanceHardCutoffMinutes, minutesSinceMidnight } from "../../../lib/attendanceSettings";

export const dynamic = "force-dynamic";

// Testing mode is OFF — the real attendance window (Admin → Contact
// Settings → attendance start / hard-cutoff time) is enforced again.
const ATTENDANCE_WINDOW_DISABLED_FOR_TESTING = false;

function today() {
  return pktDateStr();
}

export async function GET() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const db = await readDB();
  const record = db.teacherAttendance?.[session.username]?.[today()] || null;
  const settings = getAttendanceSettings(db);
  return NextResponse.json({ record, settings }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { latitude, longitude, accuracy, deviceInfo } = await req.json();
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Location not available." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let precheckDb;
  try {
    precheckDb = await readDB();
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not reach the database." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const settings = getAttendanceSettings(precheckDb);
  const now = new Date();
  const nowMinutes = minutesSinceMidnight(now);
  const startMinutes = attendanceStartMinutes(settings);
  const cutoffMinutes = attendanceHardCutoffMinutes(settings);

  // Attendance can only be marked inside the admin-configured window —
  // skipped entirely while ATTENDANCE_WINDOW_DISABLED_FOR_TESTING is true.
  if (!ATTENDANCE_WINDOW_DISABLED_FOR_TESTING) {
    if (nowMinutes < startMinutes) {
      return NextResponse.json(
        { error: `Attendance opens at ${settings.attendanceStartTime}. Please try again after that time. (Pakistan time now: ${pktTimeLabel(now)})` },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (nowMinutes > cutoffMinutes) {
      return NextResponse.json(
        { error: `Attendance can only be marked before ${settings.attendanceHardCutoff}. Please contact the admin office.` },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  if (!isWithinSchoolGeofence(latitude, longitude, accuracy)) {
    const distance = Math.round(distanceInMeters(latitude, longitude, SCHOOL_LAT, SCHOOL_LNG));
    const acc = typeof accuracy === "number" ? Math.round(accuracy) : null;
    // The exact reading (and the phone's own GPS accuracy) is included on
    // purpose — it's the fastest way to confirm or correct the stored
    // school coordinates (lib/geofence.js), and to see whether a failure
    // is a wrong pin or just a weak GPS signal at that moment.
    return NextResponse.json(
      {
        error: acc
          ? `You are not in school premises, attendance cannot be marked. (${distance}m away, GPS accuracy ±${acc}m)`
          : `You are not in school premises, attendance cannot be marked. (${distance}m away)`,
        detectedLat: latitude,
        detectedLng: longitude,
        detectedAccuracy: acc,
      },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now2 = new Date();
  const record = {
    teacher_id: session.username,
    teacher_name: session.username,
    timestamp: now2.toISOString(),
    latitude,
    longitude,
    device_info: deviceInfo || "unknown",
  };

  try {
    await updateDB((db) => {
      if (!db.teacherAttendance) db.teacherAttendance = {};
      if (!db.teacherAttendance[session.username]) db.teacherAttendance[session.username] = {};
      const teacher = db.teachers.find((t) => t.username === session.username);
      record.teacher_name = teacher?.name || session.username;
      db.teacherAttendance[session.username][today()] = record;
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not save attendance. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  // Admin sees the exact date and time the teacher checked in.
  const dateLabel = pktDateLabel(now2);
  const timeLabel = pktTimeLabel(now2);
  try {
    await sendPushToAdmins({
      title: "Teacher checked in",
      body: `${record.teacher_name} marked attendance on ${dateLabel} at ${timeLabel}.`,
      url: "/admin/dashboard/teacher-attendance",
    });
  } catch (err) {
    // don't fail the check-in over a notification error
  }

  return NextResponse.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
}
