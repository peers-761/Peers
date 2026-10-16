import { NextResponse } from "next/server";
import { readDB, docGet, docSet, docList } from "../../../lib/data";
import { requireStaffForClass, staffClassFilter } from "../../../lib/monthlyAuth";
import { newId, defaultSubjects } from "../../../lib/monthlyTests";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const prefix = "monthly:";

// GET ?className=9   -> the monthly tests of one class (newest first)
// GET ?studentId=X   -> every monthly test that includes this student
// GET (nothing)      -> all of them
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("className");
  const studentId = searchParams.get("studentId");

  const session = await requireStaffForClass(className);
  if (!session) return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });

  const docs = (await docList(prefix)).map((d) => d.value).filter(Boolean);
  let tests = docs;
  if (className) tests = tests.filter((t) => t.className === className);
  if (studentId) tests = tests.filter((t) => (t.groups || []).some((g) => (g.studentIds || []).includes(studentId)));
  // A teacher with no explicit class in the query is still limited to
  // their own assigned classes, same as everywhere else in the app.
  const limitTo = await staffClassFilter(session);
  if (limitTo) tests = tests.filter((t) => limitTo.includes(t.className));
  tests.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(tests, { headers: NO_STORE });
}

// POST { className, title } -> creates a monthly test with one starter table
// holding every student of the class.
export async function POST(req) {
  const { className, title } = await req.json();
  if (!className) return NextResponse.json({ error: "Choose a class." }, { status: 400, headers: NO_STORE });
  const session = await requireStaffForClass(className);
  if (!session) return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });

  const db = await readDB();
  const students = db.students?.[className] || [];
  const now = new Date().toISOString();
  const test = {
    id: newId("mt"),
    className,
    title: (title || "").trim() || "Monthly Test",
    groups: [
      {
        id: newId("g"),
        label: "",
        section: "All",
        subjects: defaultSubjects(),
        studentIds: students.map((s) => s.id),
        marks: {},
      },
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: session.username,
    createdByRole: session.role,
  };
  await docSet(prefix + test.id, test);
  return NextResponse.json(test, { headers: NO_STORE });
}
