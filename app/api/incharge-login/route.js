import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { username, password } = await req.json();
  const db = await readDB();

  const creds = db.inchargeCredentials || { username: "incharge", password: "incharge123" };

  if (username === creds.username && password === creds.password) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("incharge", username), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ error: "Incorrect username or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
