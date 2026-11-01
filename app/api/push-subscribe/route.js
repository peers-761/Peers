import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // The role comes from the REAL signed-in session — never from what the
  // browser claims — so nobody can subscribe themselves as "admin" and
  // receive the school's private notifications.
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const body = await req.json();
  const { subscription } = body;
  const role = session.role;
  const studentId = role === "parent" ? String(session.username).split("__")[1] || null : null;

  await updateDB((db) => {
    // Clean up any subscriptions saved in the old format (before role
    // tagging existed) — they'd otherwise crash the lookup below and never
    // match any role filter, silently breaking notifications.
    const validSubs = (db.pushSubscriptions || []).filter((s) => s?.subscription?.endpoint);

    const idx = validSubs.findIndex((s) => s.subscription.endpoint === subscription.endpoint);
    const entry = { subscription, role: role || "admin", studentId: studentId || null };

    if (idx === -1) {
      validSubs.push(entry);
    } else {
      // Same device/browser subscribing again (e.g. it was an admin's test
      // subscription before, now a parent is enabling notifications on the
      // same phone) — update the role instead of keeping the stale one.
      validSubs[idx] = entry;
    }

    db.pushSubscriptions = validSubs;
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
