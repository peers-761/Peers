import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB } from "../../../lib/data";
import { sendPushToAdmins } from "../../../lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await adminOnly(); if (deny) return deny;
  const db = await readDB();
  return NextResponse.json(Array.isArray(db.admissionInquiries) ? db.admissionInquiries : [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const { childName, className, phone } = await req.json();
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  await updateDB((db) => {
    if (!Array.isArray(db.admissionInquiries)) db.admissionInquiries = [];
    db.admissionInquiries.unshift({ id: "a" + Date.now(), childName, className, phone, date: new Date().toISOString() });
  });

  try {
    await sendPushToAdmins({ title: "New admission inquiry", body: `${childName} — ${className} — ${phone}`, url: "/admin/dashboard/admissions" });
  } catch (err) {}

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { id } = await req.json();
  await updateDB((db) => {
    db.admissionInquiries = (Array.isArray(db.admissionInquiries) ? db.admissionInquiries : []).filter((a) => a.id !== id);
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
