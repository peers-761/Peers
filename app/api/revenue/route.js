import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { buildRevenue, buildCollection } from "../../../lib/revenue";
import { pktDateStr } from "../../../lib/time";

export const dynamic = "force-dynamic";

// GET /api/revenue?year=2026&month=all|1..12  (admin only)
export async function GET(req) {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year")) || Number(pktDateStr().slice(0, 4));
  const m = searchParams.get("month") || "all";
  const db = await readDB();

  // GET /api/revenue?from=2026-11-01&to=2026-11-15 -> money received in that period
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
    if (!ok(from) || !ok(to) || from > to) {
      return NextResponse.json({ error: "Pick a valid from and to date." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(buildCollection(db, from, to), { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(buildRevenue(db, year, m === "all" ? "all" : Number(m)), { headers: { "Cache-Control": "no-store" } });
}
