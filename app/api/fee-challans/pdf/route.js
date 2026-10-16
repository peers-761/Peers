import { cookies } from "next/headers";
import { readDB } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";
import { buildChallanPdf } from "../../../../lib/pdf";
import { currentMonth, normalizeChallan } from "../../../../lib/feeChallan";

export const dynamic = "force-dynamic";

// Parent: downloads their own child's current voucher.
// Incharge/Admin: /api/fee-challans/pdf?studentId=...&month=YYYY-MM for any student.
export async function GET(req) {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session) {
    return new Response("Not signed in.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let studentId;
  let month = currentMonth();

  if (session.role === "parent") {
    studentId = session.username.split("__")[1];
  } else if (session.role === "admin" || session.role === "incharge") {
    studentId = searchParams.get("studentId");
    month = searchParams.get("month") || month;
  } else {
    return new Response("Not allowed.", { status: 403 });
  }

  const db = await readDB();
  const challan = db.feeChallans?.[studentId]?.[month];
  if (!challan) {
    return new Response("No challan found for this month.", { status: 404 });
  }
  normalizeChallan(challan); // works on this request's own copy only

  const paidOn = challan.status === "verified" && (challan.reviewedAt || challan.submittedAt)
    ? new Date(challan.reviewedAt || challan.submittedAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi",
      })
    : null;

  // The QR must open on the SAME website the voucher was downloaded from, so
  // it can never point to a wrong / non-existent address.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const siteUrl = host ? `${proto}://${host}` : new URL(req.url).origin;

  const pdfBytes = await buildChallanPdf({
    siteUrl,
    studentName: challan.studentName,
    fatherName: challan.fatherName,
    studentId,
    className: challan.className,
    section: challan.section,
    rollNo: challan.rollNo,
    month: challan.month,
    items: challan.items,
    totalDue: challan.totalDue,
    schoolName: db.settings?.schoolName,
    status: challan.status,
    paidOn,
    paidAmount: challan.paidAmount ?? challan.totalDue,
  });

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Fee-Challan-${studentId}-${month}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
