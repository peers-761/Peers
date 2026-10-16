import { NextResponse } from "next/server";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";
import { readDB } from "../../../lib/data";

export async function POST(req) {
  const { username, password } = await req.json();
  const db = await readDB();

  const teacher = db.teachers.find((t) => t.username === username && t.password === password);

  if (teacher) {
    const res = NextResponse.json({ ok: true, name: teacher.name, assignedClasses: teacher.assignedClasses });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("teacher", username), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: "Incorrect username or password." }, { status: 401 });
}
