// Daily job: deletes any Parent Portal test report whose 30-day window is
// over. This ONLY touches db.parentTestResults (what parents see) — the
// teacher/incharge's own copy in db.testResults is never deleted by this
// job; that copy is removed only when a teacher/incharge presses Delete.
//
// Triggered by Vercel Cron (see vercel.json) or an external pinger.

import { updateDB } from "../../../../lib/data";

export const dynamic = "force-dynamic";

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

  const now = Date.now();
  let removed = 0;

  await updateDB((db) => {
    if (!db.parentTestResults) return;
    for (const [studentId, rows] of Object.entries(db.parentTestResults)) {
      const kept = rows.filter((r) => {
        const expired = r.expiresAt && new Date(r.expiresAt).getTime() < now;
        if (expired) removed++;
        return !expired;
      });
      db.parentTestResults[studentId] = kept;
    }
  });

  return Response.json({ ok: true, removed });
}
