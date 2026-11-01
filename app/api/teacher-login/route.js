import { NextResponse } from "next/server";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";
import { readDB } from "../../../lib/data";
import { loginLockedMinutes, loginFailed, loginSucceeded } from "../../../lib/loginGuard";

export async function POST(req) {
  const { username, password } = await req.json();
  const wait = await loginLockedMinutes(req, "teacher:" + username);
  if (wait) return NextResponse.json({ ok: false, error: `Too many wrong attempts. Please try again in ${wait} minute(s).` }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const db = await readDB();

  const teacher = db.teachers.find((t) => t.username === username && t.password === password);

  if (teacher) {
    await loginSucceeded(req, "teacher:" + username);
    const res = NextResponse.json({ ok: true, name: teacher.name, assignedClasses: teacher.assignedClasses });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("teacher", username), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  await loginFailed(req, "teacher:" + username);
  return NextResponse.json({ ok: false, error: "Incorrect username or password." }, { status: 401 });
}
