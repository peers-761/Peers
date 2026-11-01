import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.settings || {}, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const body = await req.json();
  const settings = await updateDB((db) => {
    db.settings = { ...db.settings, ...body };
    return db.settings;
  });
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}
