import { NextResponse } from "next/server";
import { getSession, newId, listTests, saveTest, listAttempts, testPhase } from "../../../lib/onlineTests";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// GET: admin -> every test; teacher -> tests assigned to them for checking
export async function GET() {
  const session = getSession();
  if (!session || (session.role !== "admin" && session.role !== "teacher")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }

  try {
    let tests = await listTests();
    if (session.role === "teacher") {
      tests = tests.filter((t) => t.checkerTeacher === session.username && t.status !== "draft");
    }
    const out = [];
    for (const t of tests) {
      const attempts = await listAttempts(t.id);
      out.push({
        id: t.id,
        title: t.title,
        type: t.type,
        className: t.className,
        subject: t.subject,
        durationMin: t.durationMin,
        status: t.status,
        phase: testPhase(t),
        startedAt: t.startedAt || null,
        endsAt: t.endsAt || null,
        checkerTeacher: t.checkerTeacher || null,
        checkerName: t.checkerName || null,
        createdAt: t.createdAt,
        enrolled: attempts.length,
        checked: attempts.filter((a) => a.checkedAt).length,
      });
    }
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not load tests." }, { status: 500, headers: NO_STORE });
  }
}

function positiveInt(v, fallback = 0) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// POST: admin creates a draft test (the PDF pages are uploaded next).
export async function POST(req) {
  const session = getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Only the admin can create tests." }, { status: 401, headers: NO_STORE });
  }

  const b = await req.json();
  const title = String(b.title || "").trim();
  const durationMin = positiveInt(b.durationMin);
  if (!title) return NextResponse.json({ error: "Enter a test title." }, { status: 400, headers: NO_STORE });
  if (!["unit", "quarter", "half", "full"].includes(b.type)) {
    return NextResponse.json({ error: "Choose the test type." }, { status: 400, headers: NO_STORE });
  }
  if (!["9", "10"].includes(String(b.className))) {
    return NextResponse.json({ error: "Choose class 9 or 10." }, { status: 400, headers: NO_STORE });
  }
  if (durationMin < 1 || durationMin > 360) {
    return NextResponse.json({ error: "Duration must be between 1 and 360 minutes." }, { status: 400, headers: NO_STORE });
  }

  const mcqCount = positiveInt(b.mcqCount);
  const shortCount = positiveInt(b.shortCount);
  const longCount = positiveInt(b.longCount);
  if (mcqCount + shortCount + longCount === 0) {
    return NextResponse.json({ error: "Enter how many MCQs / short / long questions the paper has." }, { status: 400, headers: NO_STORE });
  }
  if (mcqCount > 200 || shortCount > 60 || longCount > 30) {
    return NextResponse.json({ error: "Too many questions. Please check the numbers." }, { status: 400, headers: NO_STORE });
  }

  // Optional MCQ answer key, typed like "ABCDABCD..." (one letter per MCQ).
  let answerKey = null;
  const rawKey = String(b.answerKey || "").toUpperCase().replace(/[^A-D]/g, "");
  if (rawKey) {
    if (rawKey.length !== mcqCount) {
      return NextResponse.json(
        { error: `Answer key has ${rawKey.length} letters but the paper has ${mcqCount} MCQs.` },
        { status: 400, headers: NO_STORE }
      );
    }
    answerKey = {};
    for (let i = 0; i < rawKey.length; i++) answerKey[i + 1] = rawKey[i];
  }

  const test = {
    id: newId("t"),
    title,
    type: b.type,
    className: String(b.className),
    subject: String(b.subject || "").trim(),
    durationMin,
    mcqCount,
    shortCount,
    longCount,
    marksMcq: positiveInt(b.marksMcq, 1),
    marksShort: positiveInt(b.marksShort, 2),
    marksLong: positiveInt(b.marksLong, 5),
    answerKey,
    pages: [],
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  await saveTest(test);
  return NextResponse.json(test, { headers: NO_STORE });
}
