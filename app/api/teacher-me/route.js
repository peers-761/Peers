import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieValue = cookies().get(SESSION_COOKIE)?.value;
  const session = cookieValue ? readSessionValue(cookieValue) : null;

  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const db = await readDB();
  const teacher = db.teachers.find((t) => t.username === session.username);

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { name: teacher.name, assignedClasses: teacher.assignedClasses || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
