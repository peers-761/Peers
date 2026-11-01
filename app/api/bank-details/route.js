import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(
    db.bankDetails || { bankName: "", accountTitle: "", iban: "", jazzcash: "", easypaisa: "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const body = await req.json();
  const bankDetails = await updateDB((db) => {
    db.bankDetails = { ...db.bankDetails, ...body };
    return db.bankDetails;
  });
  return NextResponse.json(bankDetails, { headers: { "Cache-Control": "no-store" } });
}
