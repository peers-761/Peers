import { NextResponse } from "next/server";
import { getSession, listTests, getAttempt, testPhase, finalizeAttempts } from "../../../../lib/onlineTests";
import { computeResult, mistakeCount, pktDay } from "../../../../lib/onlineTestShared";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// Parent portal: is a test running for my child's class? + published results.
export async function GET() {
  const session = getSession();
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }
  const [className, studentId] = session.username.split("__");

  try {
    const tests = (await listTests()).filter((t) => t.className === className && t.status !== "draft");
    const live = [];
    const results = [];
    for (const t of tests) {
      const phase = testPhase(t);
      const attempt = await getAttempt(t.id, studentId);
      if (phase === "live") {
        live.push({
          id: t.id,
          title: t.title,
          subject: t.subject,
          durationMin: t.durationMin,
          endsAt: t.endsAt,
          enrolled: !!attempt,
          submitted: !!attempt?.submittedAt,
        });
      } else if (phase === "published" && attempt) {
        await finalizeAttempts(t, [attempt]);
        results.push({
          id: t.id,
          title: t.title,
          type: t.type,
          subject: t.subject,
          className: t.className,
          date: t.startedAt,
          day: pktDay(t.startedAt),
          checked: !!attempt.checkedAt,
          comment: attempt.comment || "",
          result: attempt.checkedAt ? computeResult(t, attempt) : null,
          submitReason: attempt.submitReason || null,
          mistakes: mistakeCount(attempt.mistakes),
        });
      }
    }
    results.sort((a, b) => (a.date < b.date ? 1 : -1));

    // Annual summary: how the child is doing across every checked online test.
    const checked = results.filter((r) => r.result);
    const annual =
      checked.length > 0
        ? {
            testsTaken: results.length,
            testsChecked: checked.length,
            averagePercentage: Math.round((checked.reduce((s, r) => s + r.result.percentage, 0) / checked.length) * 10) / 10,
            bySubject: Object.entries(
              checked.reduce((acc, r) => {
                const key = r.subject || "General";
                (acc[key] ||= []).push(r.result.percentage);
                return acc;
              }, {})
            ).map(([subject, list]) => ({ subject, average: Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10, count: list.length })),
          }
        : null;

    return NextResponse.json({ live, results, annual }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not load tests." }, { status: 500, headers: NO_STORE });
  }
}
