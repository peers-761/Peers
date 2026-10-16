import webpush from "web-push";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "./vapid";
import { readDB, updateDB } from "./data";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Sends one payload to a list of subscriptions. Dead subscriptions (the
// browser cancelled them: 410 Gone / 404) are removed from the database.
// This function NEVER throws — a notification problem must not break the
// feature that triggered it (attendance saving, fee reminders...).
async function sendToSubs(subs, payload) {
  return sendPairs(subs.map((entry) => ({ entry, payload })));
}

// Sends many (subscription, payload) pairs, a few at a time.
async function sendPairs(pairs) {
  if (pairs.length === 0) return;

  const deadEndpoints = new Set();
  const CHUNK = 25;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const chunk = pairs.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map(({ entry, payload }) => webpush.sendNotification(entry.subscription, JSON.stringify(payload)))
    );
    results.forEach((r, idx) => {
      if (r.status === "rejected" && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        deadEndpoints.add(chunk[idx].entry.subscription.endpoint);
      }
    });
  }

  if (deadEndpoints.size > 0) {
    try {
      await updateDB((db) => {
        db.pushSubscriptions = (db.pushSubscriptions || []).filter(
          (entry) => !deadEndpoints.has(entry?.subscription?.endpoint)
        );
      });
    } catch (err) {
      // cleanup is optional — ignore
    }
  }
}

// Admin-only alerts: attendance marked, new admission inquiry, new contact
// message — internal/business notifications parents don't need.
export async function sendPushToAdmins(payload) {
  const db = await readDB();
  const subs = (db.pushSubscriptions || []).filter((s) => s?.subscription?.endpoint && s.role === "admin");
  await sendToSubs(subs, payload);
}

// Everyone who turned on notifications — used for public notices/
// announcements, since those are meant for parents too.
export async function sendPushToEveryone(payload) {
  const db = await readDB();
  const subs = (db.pushSubscriptions || []).filter((s) => s?.subscription?.endpoint);
  await sendToSubs(subs, payload);
}

// Targeted per-student alerts: only the parent of that specific student
// gets notified, with that child's own attendance status — not every
// parent in the school.
// Targeted alert to one specific student's parent — used for fee
// reminders and anything else tied to a single student rather than a
// whole class's attendance.
export async function sendPushToParent(studentId, payload) {
  const db = await readDB();
  const subs = (db.pushSubscriptions || []).filter(
    (s) => s?.subscription?.endpoint && s.role === "parent" && s.studentId === studentId
  );
  await sendToSubs(subs, payload);
}

// Same as sendPushToParent but for many students at once, reading the
// database only one time. items: [{ studentId, payload }]
export async function sendPushToParents(items) {
  const db = await readDB();
  const subs = (db.pushSubscriptions || []).filter((s) => s?.subscription?.endpoint && s.role === "parent");
  const byStudent = new Map();
  for (const s of subs) {
    if (!byStudent.has(s.studentId)) byStudent.set(s.studentId, []);
    byStudent.get(s.studentId).push(s);
  }
  const pairs = [];
  for (const { studentId, payload } of items) {
    for (const entry of byStudent.get(studentId) || []) pairs.push({ entry, payload });
  }
  await sendPairs(pairs);
  return pairs.length;
}

export async function sendAttendanceNotificationsToParents(className, date, records) {
  const db = await readDB();
  const allSubs = db.pushSubscriptions || [];
  const students = db.students?.[className] || [];

  const statusLabel = { present: "Present", absent: "Absent", leave: "On leave" };

  await Promise.all(
    Object.entries(records).map(async ([studentId, status]) => {
      const parentSubs = allSubs.filter(
        (s) => s?.subscription?.endpoint && s.role === "parent" && s.studentId === studentId
      );
      if (parentSubs.length === 0) return;

      const student = students.find((s) => s.id === studentId);
      const name = student?.name || "Your child";

      if (status === "absent") {
        await sendToSubs(parentSubs, {
          title: "Absence notice",
          body: `Your child ${name} is absent today. Please provide the reason.`,
          url: `/parent/dashboard/absence/${date}`,
        });
        return;
      }

      await sendToSubs(parentSubs, {
        title: "Attendance update",
        body: `${name} was marked ${statusLabel[status] || status} today (${date}).`,
        url: "/parent/dashboard",
      });
    })
  );
}
