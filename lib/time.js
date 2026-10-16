// The whole school (and every user of this site) is in Pakistan, which
// stays at a fixed UTC+5 all year (no daylight saving). But every server
// Date object works in UTC underneath, and Vercel's servers can run in
// any region — so anything computed with the raw system/browser clock
// (`new Date().toISOString().slice(0,10)`) silently uses the WRONG
// calendar day for roughly five hours every night (from 12:00 AM to
// 4:59 AM Pakistan time, it's still "yesterday" in UTC). That mismatch
// is what made attendance, absence reasons, and notifications
// intermittently disappear or land on the wrong date.
//
// Use these everywhere a "today" or "this date" is needed, on both the
// client and the server, instead of touching toISOString() directly.

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

// The current date in Pakistan, as YYYY-MM-DD — the one and only
// definition of "today" this app should use.
export function pktDateStr(date = new Date()) {
  return new Date(date.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

// The current year-month in Pakistan, as YYYY-MM (for monthly fee
// challans, reports, etc).
export function pktMonthStr(date = new Date()) {
  return pktDateStr(date).slice(0, 7);
}

// ---- Pakistan clock helpers (server runs in UTC, school runs in PKT) ----

// Minutes since midnight in Pakistan (e.g. 7:30 AM -> 450).
export function pktMinutesSinceMidnight(date = new Date()) {
  const d = new Date(date.getTime() + PKT_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// Hour of day (0-23) in Pakistan.
export function pktHour(date = new Date()) {
  return new Date(date.getTime() + PKT_OFFSET_MS).getUTCHours();
}

// Day of week in Pakistan (0 = Sunday).
export function pktDayOfWeek(date = new Date()) {
  return new Date(date.getTime() + PKT_OFFSET_MS).getUTCDay();
}

// "7:32 AM" in Pakistan time.
export function pktTimeLabel(date = new Date()) {
  const d = new Date(date.getTime() + PKT_OFFSET_MS);
  let h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// "24 Sep 2026" in Pakistan time.
export function pktDateLabel(date = new Date()) {
  const d = new Date(date.getTime() + PKT_OFFSET_MS);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
