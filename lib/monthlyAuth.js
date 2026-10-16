import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "./auth";
import { isAdminSessionValid } from "./adminSessions";
import { readDB } from "./data";

export async function requireAdmin() {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") return null;
  const ok = await isAdminSessionValid(session.sid).catch(() => true);
  return ok ? session : null;
}

// Monthly test reports can be prepared by Admin, Incharge (any class), or a
// Teacher for one of their own assigned classes. Pass the className being
// acted on (for creating/listing a specific class) — pass null when the
// class isn't known yet (e.g. listing everything), in which case a teacher
// is still allowed through here and gets filtered down to their own
// classes by the caller.
export async function requireStaffForClass(className) {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session) return null;

  if (session.role === "admin") {
    const ok = await isAdminSessionValid(session.sid).catch(() => true);
    return ok ? session : null;
  }
  if (session.role === "incharge") return session;

  if (session.role === "teacher") {
    if (!className) return session; // caller will filter the list themselves
    const db = await readDB();
    const teacher = (db.teachers || []).find((t) => t.username === session.username);
    const assigned = teacher?.assignedClasses;
    if (!assigned || assigned.length === 0 || assigned.includes(className)) return session;
    return null; // a real teacher, just not assigned to this class
  }

  return null;
}

// For a listing endpoint: teacher's own assigned classes, or null meaning
// "no restriction" (admin / incharge / a teacher with no assigned list).
export async function staffClassFilter(session) {
  if (session.role !== "teacher") return null;
  const db = await readDB();
  const teacher = (db.teachers || []).find((t) => t.username === session.username);
  const assigned = teacher?.assignedClasses;
  return assigned && assigned.length > 0 ? assigned : null;
}
