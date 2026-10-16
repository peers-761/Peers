import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieValue = cookies().get(SESSION_COOKIE)?.value;
  const session = cookieValue ? readSessionValue(cookieValue) : null;

  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [className, studentId] = session.username.split("__");
  const db = await readDB();
  const student = (db.students[className] || []).find((s) => s.id === studentId);

  if (!student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const classAttendance = db.attendance?.[className] || {};
  const history = Object.entries(classAttendance)
    .filter(([, records]) => records[studentId])
    .map(([date, records]) => ({ date, status: records[studentId] }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json(
    {
      id: student.id,
      name: student.name,
      className,
      fee: db.feeStructure?.[className] ?? null,
      attendance: history,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
