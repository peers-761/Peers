import { NextResponse } from "next/server";
import { getSession, getTest, getAttempt } from "../../../../../lib/onlineTests";
import { computeResult, autoMcqMarks } from "../../../../../lib/onlineTestShared";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// A parent's full view of ONE published result for their own child.
// Deliberately leaves out: cheating flags, and any other student's data.
export async function GET(req, { params }) {
  const session = getSession();
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }
  const [className, studentId] = session.username.split("__");

  const test = await getTest(params.testId);
  if (!test || test.className !== className || test.status !== "published") {
    return NextResponse.json({ error: "Result not found." }, { status: 404, headers: NO_STORE });
  }
  const attempt = await getAttempt(test.id, studentId);
  if (!attempt) return NextResponse.json({ error: "Result not found." }, { status: 404, headers: NO_STORE });

  return NextResponse.json(
    {
      test: {
        title: test.title,
        type: test.type,
        subject: test.subject,
        startedAt: test.startedAt,
        mcqCount: test.mcqCount,
        shortCount: test.shortCount,
        longCount: test.longCount,
        marksMcq: test.marksMcq,
        marksShort: test.marksShort,
        marksLong: test.marksLong,
        answerKey: test.answerKey,
      },
      answers: attempt.answers,
      marks: attempt.marks || {},
      mistakes: attempt.mistakes || {},
      comment: attempt.comment || "",
      checked: !!attempt.checkedAt,
      result: attempt.checkedAt ? computeResult(test, attempt) : null,
      autoMcq: autoMcqMarks(test, attempt),
    },
    { headers: NO_STORE }
  );
}
