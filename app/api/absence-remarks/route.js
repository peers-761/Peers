import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB, saveImage } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(Array.isArray(db.absenceRemarks) ? db.absenceRemarks : [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
    if (!session || session.role !== "parent") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { date, reason, remarks, proofImage } = await req.json();
    const [className, studentId] = session.username.split("__");

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Please provide a reason." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const id = "ar" + Date.now();
    let imageKey = null;
    if (proofImage) {
      try {
        imageKey = `absence-proof:${id}`;
        await saveImage(imageKey, proofImage);
      } catch (err) {
        // Don't let an image upload problem block the reason itself from
        // being recorded — save the reason without the photo.
        imageKey = null;
      }
    }

    await updateDB((db) => {
      const student = (db.students[className] || []).find((s) => s.id === studentId);
      if (!Array.isArray(db.absenceRemarks)) db.absenceRemarks = [];
      db.absenceRemarks.unshift({
        id,
        studentId,
        className,
        studentName: student?.name || "Unknown",
        date,
        reason: reason.trim(),
        remarks: (remarks || "").trim(),
        proofImage: imageKey,
        submittedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not submit. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
