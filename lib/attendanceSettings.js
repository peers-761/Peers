// Central place for teacher self-attendance timing rules. Admin can edit
// these from /admin/dashboard/settings — this file only supplies safe
// defaults if the admin hasn't set anything yet.
//
// Simple by design: a teacher can mark attendance any time between the
// start time and the hard cutoff. No popups, no grace period — if they
// haven't marked by the hard cutoff, the admin gets a single "absent"
// notification with the exact date.

import { pktMinutesSinceMidnight, pktDateStr, pktDayOfWeek } from "./time";

export const DEFAULT_ATTENDANCE_SETTINGS = {
  attendanceStartTime: "07:15", // earliest a teacher can mark self-attendance
  attendanceHardCutoff: "09:25", // last moment attendance can be marked; absent check fires at this time
  escalationWindowEndHour: 14, // safety bound — never send an absent check after this hour, even if the cron runs late
};

export function getAttendanceSettings(db) {
  return { ...DEFAULT_ATTENDANCE_SETTINGS, ...(db.settings?.attendance || {}) };
}

function timeStrToMinutes(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

// Always Pakistan time — the server itself runs in UTC, which is 5 hours
// behind, and that is what made "attendance opens at ..." appear wrongly.
export function minutesSinceMidnight(date = new Date()) {
  return pktMinutesSinceMidnight(date);
}

export function attendanceStartMinutes(settings) {
  return timeStrToMinutes(settings.attendanceStartTime);
}

export function attendanceHardCutoffMinutes(settings) {
  return timeStrToMinutes(settings.attendanceHardCutoff);
}

function todayStr(now = new Date()) {
  return pktDateStr(now);
}

// A day is a "school off day" if it's a Sunday, or a date the admin has
// explicitly added to the holidays list in settings.
export function isSchoolOffDay(db, now = new Date()) {
  if (pktDayOfWeek(now) === 0) return true; // Sunday
  const holidays = db.settings?.holidays || [];
  const date = todayStr(now);
  return holidays.some((h) => h.date === date);
}

export function isSchoolOffDayForDate(db, dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (d.getDay() === 0) return true;
  const holidays = db.settings?.holidays || [];
  return holidays.some((h) => h.date === dateStr);
}
