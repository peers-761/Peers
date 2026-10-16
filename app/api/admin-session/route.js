import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { isAdminSessionValid } from "../../../lib/adminSessions";

export const dynamic = "force-dynamic";

// Called by the admin pages to confirm this device is still one of the
// (at most 5) signed-in admin devices.
export async function GET() {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const ok = await isAdminSessionValid(session.sid).catch(() => true); // if the check itself fails, don't lock the admin out
  return NextResponse.json({ ok }, { status: ok ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
