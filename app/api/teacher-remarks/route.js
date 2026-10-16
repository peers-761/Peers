import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const db = await readDB();
  const remarks = (Array.isArray(db.teacherRemarks) ? db.teacherRemarks : []).filter((r) => r.studentId === studentId);
  return NextResponse.json(remarks, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { studentId, className, text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Remark can't be empty." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const entry = await updateDB((db) => {
    const teacher = db.teachers.find((t) => t.username === session.username);
    if (!Array.isArray(db.teacherRemarks)) db.teacherRemarks = [];
    const entry = {
      id: "rem" + Date.now(),
      studentId,
      className,
      text: text.trim(),
      teacherName: teacher?.name || session.username,
      date: new Date().toISOString(),
    };
    db.teacherRemarks.unshift(entry);
    return entry;
  });

  return NextResponse.json(entry, { headers: { "Cache-Control": "no-store" } });
}
