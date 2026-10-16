import { NextResponse } from "next/server";
import { readDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  const subs = db.pushSubscriptions || [];

  const summary = {
    total: subs.length,
    valid: subs.filter((s) => s?.subscription?.endpoint).length,
    malformed: subs.filter((s) => !s?.subscription?.endpoint).length,
    byRole: {
      admin: subs.filter((s) => s?.role === "admin").length,
      teacher: subs.filter((s) => s?.role === "teacher").length,
      parent: subs.filter((s) => s?.role === "parent").length,
      other: subs.filter((s) => !["admin", "teacher", "parent"].includes(s?.role)).length,
    },
    entries: subs.map((s) => ({
      role: s?.role || "(missing)",
      studentId: s?.studentId || null,
      hasValidEndpoint: !!s?.subscription?.endpoint,
      endpointPreview: s?.subscription?.endpoint ? s.subscription.endpoint.slice(0, 60) + "..." : null,
    })),
    vapidPublicKeyPresent: true,
  };

  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
