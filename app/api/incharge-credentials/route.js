import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await adminOnly(); if (deny) return deny;
  const db = await readDB();
  const creds = db.inchargeCredentials || { username: "incharge", password: "incharge123" };
  return NextResponse.json(creds, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  await updateDB((db) => {
    db.inchargeCredentials = { username, password };
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
