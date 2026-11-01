import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";
import { loginLockedMinutes, loginFailed, loginSucceeded } from "../../../lib/loginGuard";
import { SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { username, password } = await req.json();
  const wait = await loginLockedMinutes(req, "incharge:" + username);
  if (wait) return NextResponse.json({ ok: false, error: `Too many wrong attempts. Please try again in ${wait} minute(s).` }, { status: 429, headers: { "Cache-Control": "no-store" } });
  const db = await readDB();

  const creds = db.inchargeCredentials || { username: "incharge", password: "incharge123" };

  if (username === creds.username && password === creds.password) {
    await loginSucceeded(req, "incharge:" + username);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("incharge", username), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  await loginFailed(req, "incharge:" + username);
  return NextResponse.json({ error: "Incorrect username or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
