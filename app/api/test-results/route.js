import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB, RouteError } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { computeReport, REPORT_RETENTION_DAYS } from "../../../lib/testResultCalc";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

function getSession() {
  return readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
}

function isStaff(session) {
  return session && ["admin", "teacher", "incharge"].includes(session.role);
}

// A teacher may only touch reports of classes assigned to them. Admin and
// Incharge can touch every class. (A teacher with no assigned list = all.)
function canTouchClass(db, session, className) {
  if (session.role !== "teacher") return true;
  const teacher = (db.teachers || []).find((t) => t.username === session.username);
  const assigned = teacher?.assignedClasses;
  if (!assigned || assigned.length === 0) return true;
  return assigned.includes(className);
}

// Parent-visible copy expires (and is removed from the database) this
// many days after being pushed to the Parent Portal — see the daily
// cron at /api/cron/test-report-cleanup. The teacher/incharge always
// keep the full record in db.testResults, regardless of this.
function isExpired(entry) {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() < Date.now();
}

// GET
//   ?studentId=X                  staff only — every report for one student (draft + published)
//   ?className=X                  staff only — every report for a whole class (for the list page)
//   ?studentId=X (parent session) parent's own child — published, not-yet-expired reports only
export async function GET(req) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const className = searchParams.get("className");
  const db = await readDB();

  if (session.role === "parent") {
    const [, ownId] = session.username.split("__");
    if (!studentId || studentId !== ownId) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
    }
    const rows = (db.parentTestResults?.[studentId] || []).filter((r) => !isExpired(r));
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return NextResponse.json(rows, { headers: NO_STORE });
  }

  if (!isStaff(session)) return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });

  if (studentId) {
    const rows = (db.testResults?.[studentId] || [])
      .filter((r) => canTouchClass(db, session, r.className))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return NextResponse.json(rows, { headers: NO_STORE });
  }

  // Flattened listing, optionally filtered to one class — used by the
  // Teacher / Incharge "Test Reports" list pages.
  let assigned = null;
  if (session.role === "teacher") {
    const teacher = (db.teachers || []).find((t) => t.username === session.username);
    assigned = teacher?.assignedClasses?.length ? teacher.assignedClasses : null;
  }

  const all = [];
  for (const [, rows] of Object.entries(db.testResults || {})) {
    for (const r of rows) {
      if (className && r.className !== className) continue;
      if (assigned && !assigned.includes(r.className)) continue;
      all.push(r);
    }
  }
  all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(all, { headers: NO_STORE });
}

// POST { studentId, className, testName, subjects, ...notes, publish? }
// Saves a new report as a draft by default. Pass publish:true to save
// and immediately push it to the Parent Portal in one step.
export async function POST(req) {
  const session = getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Only Admin, Teacher or Incharge can prepare a test report." }, { status: 403, headers: NO_STORE });
  }

  const body = await req.json();
  const { studentId, className, testName, subjects, whatWasTheTest, marksNote, whatIsTheIssue, howToImprove, publish } = body;

  if (!studentId || !className || !subjects || Object.keys(subjects).length === 0) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400, headers: NO_STORE });
  }

  try {
    const entry = await updateDB((db) => {
      if (!canTouchClass(db, session, className)) throw new RouteError(403, "This class is not assigned to you.");
      const student = (db.students[className] || []).find((s) => s.id === studentId);
      if (!student) throw new RouteError(404, "Student not found in that class.");

      const calc = computeReport(subjects);
      const now = new Date().toISOString();

      const entry = {
        id: "res" + Date.now(),
        studentId,
        studentName: student.name,
        fatherName: student.fatherName || "",
        className,
        rollNo: student.id,
        testName: testName || "Monthly Test",
        subjects,
        totalMarks: calc.totalObtained, // kept for older UI compatibility
        totalOutOf: calc.totalOutOf,
        totalObtained: calc.totalObtained,
        average: calc.average,
        percentage: calc.percentage,
        grade: calc.grade,
        resultBar: calc.resultBar,
        whatWasTheTest: whatWasTheTest || "",
        marksNote: marksNote || "",
        whatIsTheIssue: whatIsTheIssue || "",
        howToImprove: howToImprove || "",
        preparedBy: session.username,
        preparedByRole: session.role,
        status: publish ? "published" : "draft",
        publishedAt: publish ? now : null,
        createdAt: now,
      };

      if (!db.testResults) db.testResults = {};
      if (!db.testResults[studentId]) db.testResults[studentId] = [];
      db.testResults[studentId].unshift(entry);

      if (publish) {
        if (!db.parentTestResults) db.parentTestResults = {};
        if (!db.parentTestResults[studentId]) db.parentTestResults[studentId] = [];
        const expiresAt = new Date(Date.now() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        db.parentTestResults[studentId].unshift({ ...entry, expiresAt });
      }

      return entry;
    });

    return NextResponse.json(entry, { headers: NO_STORE });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not save result." }, { status, headers: NO_STORE });
  }
}

// DELETE { studentId, id } — removes the report from the teacher/incharge
// record AND from the Parent Portal (if it was pushed). Staff only.
export async function DELETE(req) {
  const session = getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  }
  const { studentId, id } = await req.json();
  if (!studentId || !id) {
    return NextResponse.json({ error: "Missing report." }, { status: 400, headers: NO_STORE });
  }
  try {
    await updateDB((db) => {
      const existing = (db.testResults?.[studentId] || []).find((r) => r.id === id);
      if (existing && !canTouchClass(db, session, existing.className)) {
        throw new RouteError(403, "This class is not assigned to you.");
      }
      if (db.testResults?.[studentId]) {
        db.testResults[studentId] = db.testResults[studentId].filter((r) => r.id !== id);
      }
      if (db.parentTestResults?.[studentId]) {
        db.parentTestResults[studentId] = db.parentTestResults[studentId].filter((r) => r.id !== id);
      }
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not delete." }, { status: err.status || 500, headers: NO_STORE });
  }
}
