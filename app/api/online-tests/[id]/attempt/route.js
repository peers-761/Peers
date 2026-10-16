import { NextResponse } from "next/server";
import { readDB } from "../../../../../lib/data";
import {
  getSession, getTest, getAttempt, saveAttempt, testPhase, studentView, finalizeAttempts, listAttempts,
} from "../../../../../lib/onlineTests";
import { totalOutOf } from "../../../../../lib/onlineTestShared";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const err = (msg, status = 400, extra = {}) => NextResponse.json({ error: msg, ...extra }, { status, headers: NO_STORE });

function cleanAnswers(test, raw = {}) {
  const mcq = {};
  for (const [k, v] of Object.entries(raw.mcq || {})) {
    const n = Number(k);
    if (n >= 1 && n <= test.mcqCount && ["A", "B", "C", "D"].includes(v)) mcq[n] = v;
  }
  const text = {};
  for (const [k, v] of Object.entries(raw.text || {})) {
    const m = /^([SL])(\d+)$/.exec(k);
    if (!m) continue;
    const n = Number(m[2]);
    const max = m[1] === "S" ? test.shortCount : test.longCount;
    if (n >= 1 && n <= max) text[k] = String(v).slice(0, 20000);
  }
  return { mcq, text };
}

function addFlags(attempt, incoming = [], offsetGuardMs) {
  const known = new Set((attempt.flags || []).map((f) => f.cid));
  const nowMs = Date.now();
  for (const f of incoming.slice(0, 50)) {
    if (!f || !f.type || !f.cid || known.has(f.cid)) continue;
    if ((attempt.flags || []).length >= 400) break;
    let atMs = Number(f.at);
    if (!Number.isFinite(atMs) || atMs > nowMs + 60000 || atMs < nowMs - 6 * 3600 * 1000) atMs = nowMs;
    attempt.flags.push({
      cid: String(f.cid).slice(0, 40),
      type: String(f.type).slice(0, 30),
      detail: f.detail ? String(f.detail).slice(0, 120) : "",
      at: new Date(atMs).toISOString(),
    });
    known.add(f.cid);
  }
}

// GET (admin / checking teacher): one student's full attempt.
export async function GET(req, { params }) {
  const session = getSession();
  const test = await getTest(params.id);
  if (!test) return err("Test not found.", 404);
  const allowed = session && (session.role === "admin" || (session.role === "teacher" && test.checkerTeacher === session.username));
  if (!allowed) return err("Not allowed.", 401);

  const studentId = new URL(req.url).searchParams.get("studentId");
  await finalizeAttempts(test, await listAttempts(test.id));
  const attempt = await getAttempt(test.id, studentId);
  if (!attempt) return err("Attempt not found.", 404);
  return NextResponse.json({ test, attempt }, { headers: NO_STORE });
}

// POST
//  parent: { action: "enroll" | "save" | "submit", answers, flags }
//  teacher/admin: { action: "saveMarks", studentId, marks, comment }
export async function POST(req, { params }) {
  const session = getSession();
  if (!session) return err("Please sign in again.", 401);
  const test = await getTest(params.id);
  if (!test) return err("Test not found.", 404);
  const body = await req.json();
  const now = Date.now();

  // ---------------- teacher / admin: marks ----------------
  if (session.role === "teacher" || session.role === "admin") {
    if (session.role === "teacher" && test.checkerTeacher !== session.username) return err("Not your test.", 401);
    if (body.action !== "saveMarks") return err("Unknown action.");
    if (testPhase(test) === "live" || testPhase(test) === "draft") return err("Wait until the test time is over.");
    if (test.status === "published") return err("Results were already sent to parents.");

    const attempt = await getAttempt(test.id, body.studentId);
    if (!attempt) return err("Attempt not found.", 404);

    const marks = {};
    const clamp = (v, max) => Math.max(0, Math.min(max, Math.round((Number(v) || 0) * 2) / 2));
    if (!test.answerKey) marks.mcq = clamp(body.marks?.mcq, test.mcqCount * test.marksMcq);
    for (let i = 1; i <= test.shortCount; i++) marks[`S${i}`] = clamp(body.marks?.[`S${i}`], test.marksShort);
    for (let i = 1; i <= test.longCount; i++) marks[`L${i}`] = clamp(body.marks?.[`L${i}`], test.marksLong);
    attempt.marks = marks;
    attempt.comment = String(body.comment || "").slice(0, 1000);
    if (body.mistakes && typeof body.mistakes === "object") {
      const clean = {};
      for (const [k, arr] of Object.entries(body.mistakes)) {
        if (/^[SL]\d+$/.test(k) && Array.isArray(arr)) clean[k] = arr.filter((n) => Number.isInteger(n)).slice(0, 500);
      }
      attempt.mistakes = clean;
    }
    attempt.checkedAt = new Date().toISOString();
    attempt.checkedBy = session.username;
    await saveAttempt(attempt);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  // ---------------- parent / student ----------------
  if (session.role !== "parent") return err("Not allowed.", 401);
  const [className, studentId] = session.username.split("__");
  if (className !== test.className) return err("This test is not for your class.", 403);
  const phase = testPhase(test, now);

  if (body.action === "enroll") {
    const existing = await getAttempt(test.id, studentId);
    if (existing) {
      if (!existing.submittedAt && phase !== "live") {
        await finalizeAttempts(test, [existing]);
      }
      const fresh = await getAttempt(test.id, studentId);
      return NextResponse.json(
        { test: studentView(test), attempt: { answers: fresh.answers, submittedAt: fresh.submittedAt, submitReason: fresh.submitReason }, serverNow: new Date().toISOString() },
        { headers: NO_STORE }
      );
    }
    if (phase !== "live") return err("This test is not running any more.", 400, { closed: true });
    const { student } = await (async () => {
      const db = await readDB();
      return { student: (db.students?.[className] || []).find((s) => s.id === studentId) };
    })();
    if (!student) return err("Student not found.", 404);

    const attempt = {
      testId: test.id,
      studentId,
      studentName: student.name,
      fatherName: student.fatherName || "",
      className,
      section: student.section || "",
      enrolledAt: new Date(now).toISOString(),
      lastSeen: new Date(now).toISOString(),
      answers: { mcq: {}, text: {} },
      flags: [],
    };
    await saveAttempt(attempt);
    return NextResponse.json(
      { test: studentView(test), attempt: { answers: attempt.answers, submittedAt: null }, serverNow: new Date().toISOString() },
      { headers: NO_STORE }
    );
  }

  const attempt = await getAttempt(test.id, studentId);
  if (!attempt) return err("You are not enrolled in this test.", 400);

  if (attempt.submittedAt) {
    return NextResponse.json({ closed: true, submittedAt: attempt.submittedAt, submitReason: attempt.submitReason }, { headers: NO_STORE });
  }

  const endMs = new Date(test.endsAt).getTime();
  const pastEnd = now > endMs + 15000; // 15 seconds of grace for slow internet

  if (body.action === "save" || body.action === "submit") {
    if (!pastEnd) {
      attempt.answers = cleanAnswers(test, body.answers);
      addFlags(attempt, body.flags);
      attempt.lastSeen = new Date(now).toISOString();
    }
    if (body.action === "submit" || pastEnd) {
      attempt.submittedAt = new Date(Math.min(now, endMs)).toISOString();
      attempt.submitReason = pastEnd && body.action !== "submit" ? "time" : body.timeUp ? "time" : "student";
    }
    await saveAttempt(attempt);
    return NextResponse.json(
      { ok: true, closed: !!attempt.submittedAt, submittedAt: attempt.submittedAt || null, serverNow: new Date().toISOString() },
      { headers: NO_STORE }
    );
  }

  return err("Unknown action.");
}
