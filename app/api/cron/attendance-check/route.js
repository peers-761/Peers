// Runs after the attendance hard-cutoff time (e.g. 9:45 AM) and notifies
// the admin, once, about every teacher who hasn't marked attendance that
// day. No popups, no grace period — simple and predictable: miss the
// cutoff, admin gets notified with the exact date.
//
// Triggered by Vercel Cron (vercel.json) or an external pinger — see
// SETUP_VERCEL.md. Safe to call multiple times a day: each teacher is
// only ever notified once per day (tracked in db.absenceEscalations).

import { readDB, updateDB } from "../../../../lib/data";
import { sendPushToAdmins } from "../../../../lib/push";
import { pktDateStr, pktHour, pktDateLabel } from "../../../../lib/time";
import { getAttendanceSettings, minutesSinceMidnight, attendanceHardCutoffMinutes, isSchoolOffDay } from "../../../../lib/attendanceSettings";

export const dynamic = "force-dynamic";

function todayStr() {
  return pktDateStr();
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured yet — allow (dev/local only)
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await readDB();
  const settings = getAttendanceSettings(db);
  const now = new Date();

  // Never notify on a Sunday or an admin-declared holiday — no teacher is
  // expected to check in, so nobody should be flagged "absent".
  if (isSchoolOffDay(db, now)) {
    return new Response("School off today (Sunday/holiday) — skipped.", { status: 200 });
  }

  const nowMinutes = minutesSinceMidnight(now);
  const cutoffMinutes = attendanceHardCutoffMinutes(settings);

  if (nowMinutes < cutoffMinutes) {
    return new Response(`Too early — waiting for ${settings.attendanceHardCutoff}.`, { status: 200 });
  }
  if (pktHour(now) > settings.escalationWindowEndHour) {
    return new Response("Outside check window", { status: 200 });
  }

  const date = todayStr();
  const dateLabel = pktDateLabel(now);

  // Work out who needs notifying from this plain read first — sending
  // pushes is slow (network calls), so we don't want to hold the write
  // lock for all of that. We just mark who was notified in a short
  // update afterwards.
  const toNotify = (db.teachers || []).filter((teacher) => {
    const alreadyMarked = db.teacherAttendance?.[teacher.username]?.[date];
    const alreadyNotified = db.absenceEscalations?.[date]?.[teacher.username];
    return !alreadyMarked && !alreadyNotified;
  });

  let notified = 0;
  const notifiedUsernames = [];
  for (const teacher of toNotify) {
    try {
      await sendPushToAdmins({
        title: "Teacher absent",
        body: `${teacher.name} did not mark attendance by ${settings.attendanceHardCutoff} on ${dateLabel}.`,
        url: "/admin/dashboard/teacher-attendance",
      });
    } catch (err) {
      // keep going with the other teachers
    }
    notifiedUsernames.push(teacher.username);
    notified++;
  }

  if (notifiedUsernames.length > 0) {
    await updateDB((db) => {
      if (!db.absenceEscalations) db.absenceEscalations = {};
      if (!db.absenceEscalations[date]) db.absenceEscalations[date] = {};
      for (const username of notifiedUsernames) {
        // Double-check under the lock in case attendance was marked in the
        // brief window while we were sending notifications above.
        if (!db.teacherAttendance?.[username]?.[date]) {
          db.absenceEscalations[date][username] = true;
        }
      }
    });
  }

  return new Response(`Notified ${notified} absence(s)`, { status: 200 });
}
