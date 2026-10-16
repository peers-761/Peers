import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB, RouteError } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import { listTests, saveTest } from "../../../lib/onlineTests";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

function requireAdmin() {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") {
    throw new RouteError(403, "Only the admin can do this.");
  }
  return session;
}

export async function GET() {
  try {
    requireAdmin();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 403, headers: NO_STORE });
  }
  const db = await readDB();
  const safe = db.teachers.map(({ password, ...rest }) => rest);
  return NextResponse.json(safe, { headers: NO_STORE });
}

export async function POST(req) {
  try {
    requireAdmin();
    const { username, password, name, assignedClasses } = await req.json();
    await updateDB((db) => {
      if (db.teachers.some((t) => t.username === username)) {
        throw new RouteError(400, "That username is already used.");
      }
      db.teachers.push({ username, password, name, assignedClasses: assignedClasses || [] });
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not add teacher." }, { status, headers: NO_STORE });
  }
}

// DELETE { username } — admin only. Removes the teacher account AND every
// trace of their activity: attendance history, absence-notification log,
// and fingerprint (WebAuthn) registration. (Teachers don't have their own
// push-notification subscription in this app — absence alerts go to the
// admin, not the teacher — so there is nothing to clean up there.) Online
// tests they checked keep their own history (the test result itself isn't
// "this teacher's data" — it's the class's record) but no longer point at
// a deleted account.
export async function DELETE(req) {
  try {
    requireAdmin();
    const { username } = await req.json();
    if (!username) throw new RouteError(400, "Missing username.");

    await updateDB((db) => {
      const existed = (db.teachers || []).some((t) => t.username === username);
      if (!existed) throw new RouteError(404, "Teacher not found.");

      db.teachers = db.teachers.filter((t) => t.username !== username);

      if (db.teacherAttendance) delete db.teacherAttendance[username];
      if (db.teacherCredentials) delete db.teacherCredentials[username];
      if (db.webauthnChallenges) delete db.webauthnChallenges[username];

      if (db.absenceEscalations) {
        for (const date of Object.keys(db.absenceEscalations)) {
          delete db.absenceEscalations[date][username];
        }
      }

    });

    // Online tests live in their own document store (not the main JSON
    // blob) — see lib/onlineTests.js. Clear (don't delete) this teacher's
    // name off any test they were assigned to check; the test and its
    // results stay intact.
    try {
      const tests = await listTests();
      for (const test of tests) {
        if (test.checkerTeacher === username) {
          await saveTest({ ...test, checkerTeacher: null });
        }
      }
    } catch (err) {
      // Non-fatal — the teacher account is already removed either way.
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not remove the teacher." }, { status, headers: NO_STORE });
  }
}
