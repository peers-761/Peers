import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { studentId, pin } = await req.json();
  const typed = String(studentId || "").trim().toLowerCase();
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
    return NextResponse.json({ error: "Incorrect roll number / student ID or PIN." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, makeSessionValue("parent", `${foundClass}__${found.id}`), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
