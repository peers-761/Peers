import { NextResponse } from "next/server";
import { updateDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json();
  const { subscription, role, studentId } = body;

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
