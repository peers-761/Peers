import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { CLASSES } from "../../../lib/theme";

export const dynamic = "force-dynamic";

// Moves every student up one class (Pre 1 -> Pre 2 -> ... -> 10), used
// once a year after the Annual Result is announced. Students finishing
// Class 10 graduate out of the active class lists into a separate
// "graduated" record — nothing is deleted. New admissions and students
// who've left are handled separately by the admin, as usual, after this
// runs (a promoted student list is otherwise exactly who was already
// enrolled).
export async function POST() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await updateDB((db) => {
      const oldStudents = db.students || {};
      const newStudents = {};
      CLASSES.forEach((c) => {
        newStudents[c] = [];
      });

      let promotedCount = 0;
      let graduatedCount = 0;

      for (let i = 0; i < CLASSES.length; i++) {
        const fromClass = CLASSES[i];
        const toClass = CLASSES[i + 1]; // undefined for the last class (10) — those students graduate
        const students = oldStudents[fromClass] || [];

        if (toClass) {
          newStudents[toClass] = [...(newStudents[toClass] || []), ...students];
          promotedCount += students.length;
        } else {
          if (!Array.isArray(db.graduatedStudents)) db.graduatedStudents = [];
          for (const s of students) {
            db.graduatedStudents.push({ ...s, graduatedFromClass: fromClass, graduatedAt: new Date().toISOString() });
          }
          graduatedCount += students.length;
        }
      }

      db.students = newStudents;
      return { promotedCount, graduatedCount };
    });

    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not promote students. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
