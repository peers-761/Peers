import { NextResponse } from "next/server";
import { readDB, deleteImage } from "../../../../lib/data";
import {
  getSession, getTest, saveTest, deleteTestDoc, listAttempts, saveAttempt, deleteAttemptDoc,
  finalizeAttempts, testPhase,
} from "../../../../lib/onlineTests";
import { alertCounts, computeResult } from "../../../../lib/onlineTestShared";
import { sendPushToParents } from "../../../../lib/push";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const err = (msg, status = 400) => NextResponse.json({ error: msg }, { status, headers: NO_STORE });

function canView(session, test) {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.role === "teacher" && test.checkerTeacher === session.username && test.status !== "draft";
}

// GET: full test + one summary row per student (admin live monitor and
// teacher checking list both use this).
export async function GET(req, { params }) {
  const session = getSession();
  const test = await getTest(params.id);
  if (!test) return err("Test not found.", 404);
  if (!canView(session, test)) return err("Not allowed.", 401);

  const attempts = await finalizeAttempts(test, await listAttempts(test.id));
  const db = await readDB();
  const roster = db.students?.[test.className] || [];
  const now = Date.now();

  const rows = attempts.map((a) => {
    const answeredMcq = Object.keys(a.answers?.mcq || {}).length;
    const answeredText = Object.values(a.answers?.text || {}).filter((t) => String(t).trim()).length;
    const lastSeenMs = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
    return {
      studentId: a.studentId,
      studentName: a.studentName,
      section: a.section || "",
      enrolledAt: a.enrolledAt,
      lastSeen: a.lastSeen,
      online: !a.submittedAt && now - lastSeenMs < 30000,
      submittedAt: a.submittedAt || null,
      submitReason: a.submitReason || null,
      answeredMcq,
      answeredText,
      flags: a.flags || [],
      alertCounts: alertCounts(a.flags),
      checked: !!a.checkedAt,
      result: test.status === "published" || a.checkedAt ? computeResult(test, a) : null,
    };
  });
  rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const enrolledIds = new Set(attempts.map((a) => a.studentId));
  const notEnrolled = roster.filter((s) => !enrolledIds.has(s.id)).map((s) => ({ studentId: s.id, studentName: s.name, section: s.section || "" }));

  return NextResponse.json(
    { test, phase: testPhase(test), serverNow: new Date().toISOString(), rows, notEnrolled },
    { headers: NO_STORE }
  );
}

// POST { action: "execute" | "end" | "setPages" | "publish" | "delete" }
export async function POST(req, { params }) {
  const session = getSession();
  const test = await getTest(params.id);
  if (!test) return err("Test not found.", 404);
  if (!canView(session, test)) return err("Not allowed.", 401);

  const body = await req.json();
  const isAdmin = session.role === "admin";

  if (body.action === "setPages") {
    if (!isAdmin) return err("Only the admin can do this.", 401);
    if (test.status !== "draft") return err("Test already executed.");
    if (!Array.isArray(body.pages) || body.pages.length === 0) return err("No pages uploaded.");
    test.pages = body.pages.map(String);
    await saveTest(test);
    return NextResponse.json(test, { headers: NO_STORE });
  }

  if (body.action === "execute") {
    if (!isAdmin) return err("Only the admin can do this.", 401);
    if (test.status !== "draft") return err("This test has already been executed.");
    if (!test.pages?.length) return err("Upload the PDF first.");
    const db = await readDB();
    const teacher = (db.teachers || []).find((t) => t.username === body.checkerTeacher);
    if (!teacher) return err("Choose the teacher who will check this test.");

    const now = Date.now();
    test.status = "live";
    test.startedAt = new Date(now).toISOString();
    test.endsAt = new Date(now + test.durationMin * 60 * 1000).toISOString();
    test.checkerTeacher = teacher.username;
    test.checkerName = teacher.name;
    await saveTest(test);

    // Tell every parent in the class.
    let sent = 0;
    try {
      const items = (db.students?.[test.className] || []).map((s) => ({
        studentId: s.id,
        payload: {
          title: "Test has started",
          body: `${test.title}${test.subject ? " (" + test.subject + ")" : ""} has started for Class ${test.className}. Open the Parent Portal and press "Enroll Now". Time: ${test.durationMin} minutes.`,
          url: "/parent/dashboard",
        },
      }));
      sent = await sendPushToParents(items);
    } catch (e) {}
    return NextResponse.json({ ok: true, notified: sent, test }, { headers: NO_STORE });
  }

  if (body.action === "end") {
    if (!isAdmin) return err("Only the admin can do this.", 401);
    if (testPhase(test) !== "live") return err("Test is not running.");
    test.endsAt = new Date().toISOString();
    await saveTest(test);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (body.action === "publish") {
    if (testPhase(test) !== "closed") return err("Results can be sent only after the test time is over (and before they were already sent).");
    const attempts = await finalizeAttempts(test, await listAttempts(test.id));
    test.status = "published";
    test.publishedAt = new Date().toISOString();
    await saveTest(test);
    let sent = 0;
    try {
      sent = await sendPushToParents(
        attempts.map((a) => ({
          studentId: a.studentId,
          payload: {
            title: "Test result available",
            body: `The result of ${test.title} is now available in the Parent Portal.`,
            url: "/parent/dashboard",
          },
        }))
      );
    } catch (e) {}
    return NextResponse.json({ ok: true, notified: sent }, { headers: NO_STORE });
  }

  if (body.action === "delete") {
    if (!isAdmin) return err("Only the admin can do this.", 401);
    for (const a of await listAttempts(test.id)) await deleteAttemptDoc(test.id, a.studentId);
    for (const key of test.pages || []) {
      try { await deleteImage(key); } catch (e) {}
    }
    await deleteTestDoc(test.id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  return err("Unknown action.");
}
