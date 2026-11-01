import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB } from "../../../lib/data";
import { sendPushToAdmins } from "../../../lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await adminOnly(); if (deny) return deny;
  const db = await readDB();
  return NextResponse.json(Array.isArray(db.contactMessages) ? db.contactMessages : [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const { name, phone, message } = await req.json();
  await updateDB((db) => {
    if (!Array.isArray(db.contactMessages)) db.contactMessages = [];
    db.contactMessages.unshift({ id: "c" + Date.now(), name, phone, message, date: new Date().toISOString() });
  });

  try {
    await sendPushToAdmins({ title: "New contact message", body: `${name}: ${message}`, url: "/admin/dashboard/messages" });
  } catch (err) {}

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { id } = await req.json();
  await updateDB((db) => {
    db.contactMessages = (Array.isArray(db.contactMessages) ? db.contactMessages : []).filter((m) => m.id !== id);
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
