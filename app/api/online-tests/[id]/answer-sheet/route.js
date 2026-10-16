import { getSession, getTest } from "../../../../../lib/onlineTests";
import { buildAnswerSheetPdf } from "../../../../../lib/pdf";

export const dynamic = "force-dynamic";

// GET — admin or the checking teacher can download/print a blank answer
// sheet that matches this test's exact MCQ / Short / Long structure.
export async function GET(req, { params }) {
  const session = getSession();
  const test = await getTest(params.id);
  if (!test) return new Response("Test not found.", { status: 404 });
  const allowed = session && (session.role === "admin" || (session.role === "teacher" && test.checkerTeacher === session.username));
  if (!allowed) return new Response("Not allowed.", { status: 401 });

  const bytes = await buildAnswerSheetPdf({
    title: test.title,
    className: test.className,
    subject: test.subject,
    mcqCount: test.mcqCount,
    shortCount: test.shortCount,
    longCount: test.longCount,
    marksMcq: test.marksMcq,
    marksShort: test.marksShort,
    marksLong: test.marksLong,
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="answer-sheet-${test.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
