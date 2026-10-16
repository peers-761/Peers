import { NextResponse } from "next/server";
import { readDB, updateDB } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.feeStructure, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const { className, amount } = await req.json();
  const feeStructure = await updateDB((db) => {
    db.feeStructure[className] = Number(amount);
    return db.feeStructure;
  });
  return NextResponse.json(feeStructure, { headers: { "Cache-Control": "no-store" } });
}
