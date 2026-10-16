import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// Every receipt this parent has EVER submitted — every month, and every
// re-upload within a month (e.g. after a rejection) — newest first. Shown
// as "Recent Transactions" under the upload box.
export async function GET() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const [, studentId] = session.username.split("__");

  const db = await readDB();
  const monthsData = db.feeChallans?.[studentId] || {};
  const history = [];

  for (const [month, c] of Object.entries(monthsData)) {
    // Old challans (saved before this history array existed) only have a
    // single receiptImage — treat that as a one-item history so nothing
    // from before this update goes missing.
    const entries = Array.isArray(c.receiptHistory) && c.receiptHistory.length > 0
      ? c.receiptHistory
      : c.receiptImage
        ? [{ image: c.receiptImage, pdf: c.receiptPdf || null, submittedAt: c.submittedAt || null }]
        // A walk-in / cash payment the office marked paid directly, with
        // no receipt photo ever uploaded — still show it so the record
        // is complete, just without a receipt image to open.
        : c.reviewedAt
          ? [{ image: null, pdf: null, submittedAt: null }]
          : [];

    entries.forEach((entry, i) => {
      const isLatest = i === entries.length - 1;
      history.push({
        id: `${month}-${i}`,
        month,
        submittedAt: entry.submittedAt,
        receiptImage: entry.image,
        receiptPdf: entry.pdf,
        totalDue: c.totalDue,
        paidAmount: isLatest ? c.paidAmount ?? null : null,
        // Only the most recent receipt of a month carries the month's
        // actual verification status — earlier ones were superseded.
        status: isLatest ? c.status : "superseded",
        // Full record: when the office acted on it, and who (role, not
        // username) — only meaningful for the latest/current receipt.
        reviewedAt: isLatest ? c.reviewedAt || null : null,
        reviewedBy: isLatest ? c.reviewedBy || null : null,
      });
    });
  }

  history.sort((a, b) => ((b.submittedAt || b.reviewedAt || "")).localeCompare(a.submittedAt || a.reviewedAt || ""));
  return NextResponse.json(history, { headers: { "Cache-Control": "no-store" } });
}
