// Runs once a day (see vercel.json).
//
// EVERY day it makes sure each student has a fee voucher for the current
// month (with old unpaid months merged into Arrears). Before, vouchers were
// only created when somebody opened a page — so a family nobody had opened
// never got a reminder.
//
// On the 10th of the month it then sends a fee reminder to every parent
// whose current voucher is not paid (verified) yet. Each family is only
// notified once per day.

import { readDB, updateDB } from "../../../../lib/data";
import { sendPushToParents, sendPushToAdmins } from "../../../../lib/push";
import { pktDateStr, pktMonthStr } from "../../../../lib/time";
import { syncAllChallans } from "../../../../lib/feeChallan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMINDER_DAY = 10; // voucher due date is the 8th; remind 2 days after

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

  const today = pktDateStr();
  const month = pktMonthStr();
  const dayOfMonth = Number(today.slice(8, 10));

  // 1) Make sure every student has this month's voucher (+ arrears merged).
  try {
    const peek = await readDB();
    const before = JSON.stringify(peek.feeChallans || {});
    syncAllChallans(peek, month);
    if (JSON.stringify(peek.feeChallans || {}) !== before) {
      await updateDB((db) => {
        syncAllChallans(db, month);
      });
    }
  } catch (err) {
    return new Response(`Could not prepare vouchers: ${err.message}`, { status: 500 });
  }

  // ?force=1 lets the admin test the reminder on any day.
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";
  if (dayOfMonth !== REMINDER_DAY && !force) {
    return new Response(`Vouchers ready. Not the ${REMINDER_DAY}th, no reminders sent.`, { status: 200 });
  }

  // 2) Send reminders.
  const db = await readDB();
  const items = [];
  const remindedIds = [];
  for (const [studentId, months] of Object.entries(db.feeChallans || {})) {
    const challan = months[month];
    if (!challan) continue;
    if (challan.status === "verified") continue; // already paid — skip entirely
    if (db.feeReminderLog?.[today]?.[studentId]) continue; // already reminded today

    const total = Number(challan.totalDue) || 0;
    const arrears = Number(challan.items?.arrears ?? challan.previousDues) || 0;
    const extra = arrears > 0 ? ` (includes previous unpaid fee Rs. ${arrears.toLocaleString("en-PK")})` : "";
    items.push({
      studentId,
      payload: {
        title: "Fee reminder",
        body: `Dear Parent, the fee for your child ${challan.studentName} is still pending: Rs. ${total.toLocaleString("en-PK")}${extra}. Please pay as soon as possible to avoid a late fine. - PEERS Administration`,
        url: "/parent/dashboard/fee",
      },
    });
    remindedIds.push(studentId);
  }

  let sent = 0;
  try {
    sent = await sendPushToParents(items);
  } catch (err) {
    // keep going — the log below still records who we tried
  }

  if (remindedIds.length > 0) {
    await updateDB((db) => {
      if (!db.feeReminderLog) db.feeReminderLog = {};
      if (!db.feeReminderLog[today]) db.feeReminderLog[today] = {};
      for (const studentId of remindedIds) {
        db.feeReminderLog[today][studentId] = true;
      }
    });

    try {
      await sendPushToAdmins({
        title: "Fee reminders sent",
        body: `${remindedIds.length} student(s) still have pending fees this month — reminders sent to ${sent} parent device(s).`,
        url: "/admin/dashboard/fee-verification",
      });
    } catch (err) {}
  }

  return new Response(`Unpaid: ${remindedIds.length} students, notifications sent to ${sent} devices`, { status: 200 });
}
