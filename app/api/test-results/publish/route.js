import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDB, RouteError } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";
import { REPORT_RETENTION_DAYS } from "../../../../lib/testResultCalc";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// POST { studentId, id } — pushes an already-saved draft report to the
// Parent Portal. From this moment the parent's copy will auto-expire
// (and be deleted from the database) after 30 days — see
// /api/cron/test-report-cleanup. The teacher/incharge's own copy in
// db.testResults is never touched by that cleanup.
export async function POST(req) {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || !["admin", "teacher", "incharge"].includes(session.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  }
  const { studentId, id } = await req.json();
  if (!studentId || !id) {
    return NextResponse.json({ error: "Missing report." }, { status: 400, headers: NO_STORE });
  }

  try {
    const entry = await updateDB((db) => {
      const rows = db.testResults?.[studentId] || [];
      const entry = rows.find((r) => r.id === id);
      if (!entry) throw new RouteError(404, "Report not found.");
      if (session.role === "teacher") {
        const teacher = (db.teachers || []).find((t) => t.username === session.username);
        const assigned = teacher?.assignedClasses;
        if (assigned && assigned.length > 0 && !assigned.includes(entry.className)) {
          throw new RouteError(403, "This class is not assigned to you.");
        }
      }

      const now = new Date().toISOString();
      entry.status = "published";
      entry.publishedAt = now;
      entry.publishedBy = session.username;

      if (!db.parentTestResults) db.parentTestResults = {};
      if (!db.parentTestResults[studentId]) db.parentTestResults[studentId] = [];
      // Replace any earlier parent copy of this same report (re-push case).
      db.parentTestResults[studentId] = db.parentTestResults[studentId].filter((r) => r.id !== id);
      const expiresAt = new Date(Date.now() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      db.parentTestResults[studentId].unshift({ ...entry, expiresAt });

      return entry;
    });
    return NextResponse.json(entry, { headers: NO_STORE });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not push to Parent Portal." }, { status, headers: NO_STORE });
  }
}
