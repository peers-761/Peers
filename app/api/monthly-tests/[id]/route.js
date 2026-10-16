import { NextResponse } from "next/server";
import { readDB, docGet, docSet, docDelete } from "../../../../lib/data";
import { requireStaffForClass } from "../../../../lib/monthlyAuth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// The test plus the CURRENT name/father name of every student in it (names
// are looked up fresh each time so a corrected name shows everywhere).
export async function GET(_req, { params }) {
  const test = await docGet("monthly:" + params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404, headers: NO_STORE });
  if (!(await requireStaffForClass(test.className))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  }
  const db = await readDB();
  const roster = db.students?.[test.className] || [];
  const students = {};
  for (const s of roster) students[s.id] = { id: s.id, name: s.name, fatherName: s.fatherName || "", section: s.section || "Boys", rollNo: s.rollNo || "" };
  return NextResponse.json({ test, students, roster: roster.map((s) => students[s.id]) }, { headers: NO_STORE });
}

function cleanGroups(groups) {
  return (Array.isArray(groups) ? groups : []).map((g) => {
    const subjects = (g.subjects || [])
      .filter((s) => s && String(s.name || "").trim())
      .map((s) => ({ id: String(s.id), name: String(s.name).trim().slice(0, 40), total: Math.max(0, Number(s.total) || 0) }));
    const subjectIds = new Set(subjects.map((s) => s.id));
    const studentIds = [...new Set((g.studentIds || []).map(String))];
    const marks = {};
    for (const sid of studentIds) {
      const row = g.marks?.[sid] || {};
      const clean = {};
      for (const subj of subjects) {
        const v = row[subj.id];
        if (v === "" || v === null || v === undefined) continue;
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) clean[subj.id] = n;
      }
      marks[sid] = clean;
    }
    return {
      id: String(g.id),
      label: String(g.label || "").trim().slice(0, 40),
      section: ["Boys", "Girls"].includes(g.section) ? g.section : "All",
      subjects,
      studentIds,
      marks,
    };
  });
}

// PUT { title, groups } — saves the whole test.
export async function PUT(req, { params }) {
  const existing = await docGet("monthly:" + params.id);
  if (!existing) return NextResponse.json({ error: "Test not found." }, { status: 404, headers: NO_STORE });
  if (!(await requireStaffForClass(existing.className))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  }
  const body = await req.json();
  const test = {
    ...existing,
    title: String(body.title || existing.title || "Monthly Test").trim().slice(0, 80),
    groups: cleanGroups(body.groups),
    updatedAt: new Date().toISOString(),
  };
  await docSet("monthly:" + params.id, test);
  return NextResponse.json({ ok: true, updatedAt: test.updatedAt }, { headers: NO_STORE });
}

// DELETE — this is the teacher/incharge/admin's "clear path" to remove a
// monthly test report they no longer want. A teacher may only delete one
// for a class they're actually assigned to.
export async function DELETE(_req, { params }) {
  const existing = await docGet("monthly:" + params.id);
  if (!existing) return NextResponse.json({ ok: true }, { headers: NO_STORE }); // already gone
  if (!(await requireStaffForClass(existing.className))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  }
  await docDelete("monthly:" + params.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
