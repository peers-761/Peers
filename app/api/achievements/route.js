import { NextResponse } from "next/server";
import { adminOnly } from "../../../lib/guard";
import { readDB, updateDB, saveImage, deleteImage } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(Array.isArray(db.achievements) ? db.achievements : [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { image, text } = await req.json();
  if (!image && !(text || "").trim()) {
    return NextResponse.json({ error: "Add a photo, a description, or both." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const id = "a" + Date.now();
  let imageKey = null;
  if (image) {
    imageKey = `achievement:${id}`;
    await saveImage(imageKey, image);
  }

  const entry = { id, image: imageKey, text: (text || "").trim(), date: new Date().toISOString().slice(0, 10) };
  await updateDB((db) => {
    if (!Array.isArray(db.achievements)) db.achievements = [];
    db.achievements.unshift(entry);
  });
  return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req) {
  const deny = await adminOnly(); if (deny) return deny;
  const { id } = await req.json();
  await updateDB((db) => {
    const entry = (Array.isArray(db.achievements) ? db.achievements : []).find((a) => a.id === id);
    if (entry?.image) {
      deleteImage(entry.image).catch(() => {});
    }
    db.achievements = (Array.isArray(db.achievements) ? db.achievements : []).filter((a) => a.id !== id);
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
