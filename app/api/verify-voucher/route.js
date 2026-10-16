import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { sealMatches } from "../../../lib/voucherSeal";
import { normalizeChallan } from "../../../lib/feeChallan";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// Public, no-login endpoint — this is the whole point. Anyone who scans the
// QR code printed on a "PAID" voucher lands here and sees the REAL,
// live status straight from the database, not whatever is drawn on the
// PDF. A PDF image can be edited with AI/Photoshop to show a fake "PAID"
// stamp; this endpoint cannot be, because it answers from the database
// itself every time it's hit. Only pay-status info already visible on the
// voucher itself is returned — nothing extra (no phone numbers, address, etc).
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("s");
  const month = searchParams.get("m");
  if (!studentId || !month) {
    return NextResponse.json({ error: "Missing voucher reference." }, { status: 400, headers: NO_STORE });
  }

  const db = await readDB();
  const challan = db.feeChallans?.[studentId]?.[month];
  if (!challan) {
    return NextResponse.json({ error: "No voucher found for this reference." }, { status: 404, headers: NO_STORE });
  }

  normalizeChallan(challan); // this request's own copy only; same totals as the PDF

  // The printed security code (from the QR link, or typed by the person
  // checking). We never reveal the real code — we only say if it matches.
  const code = searchParams.get("c");
  const isPaid = challan.status === "verified";
  const paidAmount = isPaid ? challan.paidAmount ?? challan.totalDue ?? null : null;
  const codeChecked = !!code;
  const codeMatch = codeChecked && isPaid ? sealMatches(code, studentId, month, paidAmount) : false;

  return NextResponse.json(
    {
      codeChecked,
      codeMatch,
      studentName: challan.studentName || "",
      className: challan.className || "",
      month,
      status: challan.status || "unpaid",
      paidAmount: challan.status === "verified" ? challan.paidAmount ?? challan.totalDue ?? null : null,
      paidOn: challan.status === "verified" ? challan.reviewedAt || challan.submittedAt || null : null,
    },
    { headers: NO_STORE }
  );
}
