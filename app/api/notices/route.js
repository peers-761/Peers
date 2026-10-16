import { NextResponse } from "next/server";
import { readDB, updateDB, saveImage, deleteImage } from "../../../lib/data";
import { sendPushToEveryone } from "../../../lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.notices, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const body = await req.json();
  const id = "n" + Date.now();

  let imageKey = null;
  if (body.image) {
    imageKey = `notice:${id}`;
    await saveImage(imageKey, body.image);
  }

  const notice = {
    id,
    tag: body.tag || "Update",
    text: body.text,
    date: body.date || new Date().toISOString(),
    image: imageKey,
  };
  await updateDB((db) => {
    db.notices.unshift(notice);
  });

  try {
    await sendPushToEveryone({ title: `New notice: ${notice.tag}`, body: notice.text, url: "/notices" });
  } catch (err) {}

  return NextResponse.json(notice, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await updateDB((db) => {
    const notice = db.notices.find((n) => n.id === id);
    if (notice?.image) {
      deleteImage(notice.image).catch(() => {});
    }
    db.notices = db.notices.filter((n) => n.id !== id);
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
