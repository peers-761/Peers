import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { loginLockedMinutes, loginFailed, loginSucceeded } from "../../../lib/loginGuard";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { studentId, pin } = await req.json();
  const typed = String(studentId || "").trim().toLowerCase();
  const wait = await loginLockedMinutes(req, "parent:" + typed);
  if (wait) return NextResponse.json({ error: `Too many wrong attempts. Please try again in ${wait} minute(s).` }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const db = await readDB();

  let found = null;
  let foundClass = null;
  for (const [className, list] of Object.entries(db.students || {})) {
    // The parent can type the Student ID or the Roll Number the school gave.
    const match = list.find(
      (s) =>
        s.parentPassword === pin &&
        (String(s.id).toLowerCase() === typed || (s.rollNo && String(s.rollNo).toLowerCase() === typed))
    );
    if (match) {
      found = match;
      foundClass = className;
      break;
    }
  }

  if (!found) {
    await loginFailed(req, "parent:" + typed);
    return NextResponse.json({ error: "Incorrect roll number / student ID or PIN." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  await loginSucceeded(req, "parent:" + typed);
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, makeSessionValue("parent", `${foundClass}__${found.id}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
