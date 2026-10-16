import { NextResponse } from "next/server";
import { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_COOKIE, makeSessionValue } from "../../../lib/auth";
import { newSid, registerAdminSession, MAX_ADMIN_DEVICES } from "../../../lib/adminSessions";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { username, password } = await req.json();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sid = newSid();
    try {
      await registerAdminSession(sid, req.headers.get("user-agent") || "");
    } catch (err) {
      return NextResponse.json({ ok: false, error: "Could not sign in right now. Please try again." }, { status: 500 });
    }
    const res = NextResponse.json({ ok: true, maxDevices: MAX_ADMIN_DEVICES });
    res.cookies.set(SESSION_COOKIE, makeSessionValue("admin", username, sid), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: "Incorrect username or password." }, { status: 401 });
}
