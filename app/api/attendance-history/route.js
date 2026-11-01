import { NextResponse } from "next/server";
import { staffOnly } from "../../../lib/guard";
import { readDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const deny = staffOnly(); if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("class");
  const studentId = searchParams.get("studentId");

  if (!className || !studentId) {
    return NextResponse.json({ error: "Missing class or studentId." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

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
    { name: student.name, id: student.id, className, history },
    { headers: { "Cache-Control": "no-store" } }
  );
}
