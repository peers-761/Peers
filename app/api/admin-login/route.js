import { NextResponse } from "next/server";
import { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";
import { loginLockedMinutes, loginFailed, loginSucceeded } from "../../../lib/loginGuard";
import { newSid, registerAdminSession, MAX_ADMIN_DEVICES } from "../../../lib/adminSessions";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { username, password } = await req.json();
  const wait = await loginLockedMinutes(req, "admin:" + username);
  if (wait) return NextResponse.json({ ok: false, error: `Too many wrong attempts. Please try again in ${wait} minute(s).` }, { status: 429, headers: { "Cache-Control": "no-store" } });

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    await loginSucceeded(req, "admin:" + username);
    const sid = newSid();
    try {
      await registerAdminSession(sid, req.headers.get("user-agent") || "");
    } catch (err) {
      return NextResponse.json({ ok: false, error: "Could not sign in right now. Please try again." }, { status: 500 });
    }
    const res = NextResponse.json({ ok: true, maxDevices: MAX_ADMIN_DEVICES });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("admin", username, sid), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  await loginFailed(req, "admin:" + username);
  return NextResponse.json({ ok: false, error: "Incorrect username or password." }, { status: 401 });
}
