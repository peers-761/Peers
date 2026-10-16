import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDB, saveImage, RouteError } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { imageToPdf } from "../../../lib/pdf";
import { getOrCreateChallan, currentMonth } from "../../../lib/feeChallan";

export const dynamic = "force-dynamic";

// GET — parent fetches (or auto-generates) their own child's current challan
export async function GET() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [className, studentId] = session.username.split("__");

  try {
    const challan = await updateDB((db) => {
      const student = (db.students[className] || []).find((s) => s.id === studentId);
      if (!student) throw new RouteError(404, "Student not found.");
      const { challan } = getOrCreateChallan(db, className, studentId, student);
      return challan;
    });
    return NextResponse.json(challan, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not load challan." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

// POST — parent uploads a receipt for their current challan
export async function POST(req) {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [className, studentId] = session.username.split("__");
  const { receiptImage } = await req.json();
  if (!receiptImage) {
    return NextResponse.json({ error: "Please attach a receipt image." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const month = currentMonth();
  const imageKey = `receipt:${studentId}:${month}:${Date.now()}`;
  try {
    await saveImage(imageKey, receiptImage);
  } catch (err) {
    return NextResponse.json({ error: "Could not upload the receipt. Please check your internet and try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  // Also produce a clean, high-quality PDF version of whatever photo they
  // uploaded, so the office can view/print a proper document instead of a
  // raw phone photo — same resolution as the original, just laid out on
  // an A4 page.
  let receiptPdfKey = null;
  try {
    const match = /^data:(.+);base64,(.+)$/.exec(receiptImage);
    if (match) {
      const [, contentType, base64] = match;
      const imageBytes = Buffer.from(base64, "base64");
      const pdfBytes = await imageToPdf(imageBytes, contentType);
      const pdfDataUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
      receiptPdfKey = `receipt-pdf:${studentId}:${month}:${Date.now()}`;
      await saveImage(receiptPdfKey, pdfDataUrl);
    }
  } catch (err) {
    // If PDF conversion fails for any reason, the original photo is still
    // saved above — verification can still proceed from that.
  }

  try {
    const challan = await updateDB((db) => {
      const challan = db.feeChallans?.[studentId]?.[month];
      if (!challan) throw new RouteError(404, "No challan found for this month.");
      const submittedAt = new Date().toISOString();

      // Every submission is kept (not overwritten) so parents and the
      // office can see the full history, including old/rejected receipts
      // if the parent had to re-upload.
      if (!Array.isArray(challan.receiptHistory)) challan.receiptHistory = [];
      challan.receiptHistory.push({ image: imageKey, pdf: receiptPdfKey, submittedAt });

      challan.receiptImage = imageKey;
      challan.receiptPdf = receiptPdfKey;
      challan.status = "pending";
      challan.submittedAt = submittedAt;
      return challan;
    });
    return NextResponse.json(challan, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not save the receipt." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
