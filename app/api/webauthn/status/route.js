import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const db = await readDB();
  const registered = !!db.teacherCredentials?.[session.username];
  return NextResponse.json({ registered }, { headers: { "Cache-Control": "no-store" } });
}
