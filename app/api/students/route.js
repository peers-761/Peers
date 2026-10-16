import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB, RouteError, deleteImage } from "../../../lib/data";
import { listTests, getAttempt, deleteAttemptDoc } from "../../../lib/onlineTests";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.students, { headers: { "Cache-Control": "no-store" } });
}

function getSession() {
  const cookieValue = cookies().get(SESSION_COOKIE)?.value;
  return cookieValue ? readSessionValue(cookieValue) : null;
}

// Admin AND teachers can add students. Only the admin can remove them.
export async function POST(req) {
  const session = getSession();
  if (!session || (session.role !== "admin" && session.role !== "teacher")) {
    return NextResponse.json({ error: "Not allowed. Please sign in again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { className, name, id, section, parentPhone, fatherName, rollNo, fee } = await req.json();
  if (!className || !name || !name.trim()) {
    return NextResponse.json({ error: "Student name is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const student = await updateDB((db) => {
      if (session.role === "teacher") {
        const teacher = db.teachers.find((t) => t.username === session.username);
        if (!teacher) throw new RouteError(401, "Teacher account not found.");
        const assigned = teacher.assignedClasses || [];
        if (assigned.length > 0 && !assigned.includes(className)) {
          throw new RouteError(403, "You can only add students to your own classes.");
        }
      }
      if (!db.students[className]) db.students[className] = [];

      // The roll number IS the login ID. (If a separate ID was typed, that
      // wins; if nothing was typed, one is generated.)
      let studentId = String(id || "").trim() || String(rollNo || "").trim();
      if (studentId) {
        for (const [cls, list] of Object.entries(db.students)) {
          const clash = list.find((s) => s.id === studentId);
          if (clash) {
            throw new RouteError(
              400,
              `Login number "${studentId}" is already used by ${clash.name} (${/^\d+$/.test(cls) ? "Class " + cls : cls}). Every student needs a different number, for example ${className}-${studentId}.`
            );
          }
        }
      } else {
        const count = db.students[className].length + 1;
        studentId = `${className}-${String(count).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;
      }

      const student = {
        id: studentId,
        name: name.trim(),
        fatherName: fatherName || "",
        rollNo: String(rollNo || "").trim() || (String(id || "").trim() ? String(id).trim() : ""),
        section: section === "Girls" ? "Girls" : "Boys",
        parentPassword: String(Math.floor(1000 + Math.random() * 9000)),
        parentPhone: parentPhone || "",
      };
      // Each student can have their own monthly fee (3000, 5000, 3400...).
      // Blank = class fee from the Fee structure page is used.
      if (fee !== undefined && fee !== "" && Number(fee) > 0) student.fee = Math.round(Number(fee));
      db.students[className].push(student);
      return student;
    });
    return NextResponse.json(student, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not add student." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

// Deleting a student does not just hide them from the roster — every
// trace of them is removed so the space is actually freed (attendance
// marks, fee vouchers + their receipt photos, absence-proof photos,
// teacher remarks, offline test results, push subscription, and their
// row in every online test). This matters because Neon's free tier has
// a storage limit, and students leave the school every year.
export async function DELETE(req) {
  const session = getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Only the admin can remove students." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const { className, id } = await req.json();
  if (!className || !id) {
    return NextResponse.json({ error: "Missing student." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    // 1) Remove the student and everything about them from the main
    //    database, collecting the image keys that belong only to them.
    const { imageKeys } = await updateDB((db) => {
      const imageKeys = [];

      db.students[className] = (db.students[className] || []).filter((s) => s.id !== id);

      for (const dates of Object.values(db.attendance?.[className] || {})) {
        delete dates[id];
      }

      for (const challan of Object.values(db.feeChallans?.[id] || {})) {
        if (challan.receiptImage) imageKeys.push(challan.receiptImage);
        if (challan.receiptPdf) imageKeys.push(challan.receiptPdf);
        if (Array.isArray(challan.receiptHistory)) {
          for (const entry of challan.receiptHistory) {
            if (entry.image) imageKeys.push(entry.image);
            if (entry.pdf) imageKeys.push(entry.pdf);
          }
        }
      }
      delete db.feeChallans?.[id];

      if (Array.isArray(db.absenceRemarks)) {
        for (const r of db.absenceRemarks) {
          if (r.studentId === id && r.proofImage) imageKeys.push(r.proofImage);
        }
        db.absenceRemarks = db.absenceRemarks.filter((r) => r.studentId !== id);
      }

      if (Array.isArray(db.teacherRemarks)) {
        db.teacherRemarks = db.teacherRemarks.filter((r) => r.studentId !== id);
      }

      if (db.testResults) delete db.testResults[id];
      if (db.parentTestResults) delete db.parentTestResults[id];

      if (Array.isArray(db.pushSubscriptions)) {
        db.pushSubscriptions = db.pushSubscriptions.filter((s) => s.studentId !== id);
      }

      return { imageKeys };
    });

    // 2) Remove their row from every online test (a separate document per
    //    student, so it must be cleaned up separately) and any receipt
    //    photos that were collected above.
    const tests = await listTests().catch(() => []);
    for (const t of tests) {
      const attempt = await getAttempt(t.id, id).catch(() => null);
      if (attempt) await deleteAttemptDoc(t.id, id).catch(() => {});
    }
    for (const key of new Set(imageKeys)) {
      await deleteImage(key).catch(() => {});
    }

    return NextResponse.json({ ok: true, removedImages: imageKeys.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not remove the student." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
