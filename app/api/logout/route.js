import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { removeAdminSession } from "../../../lib/adminSessions";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (session?.role === "admin" && session.sid) {
    await removeAdminSession(session.sid).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
