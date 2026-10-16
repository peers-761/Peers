// Limits how many devices can be signed in to the Admin dashboard at once.
//
// Every admin login gets a random session id (sid) stored in the login
// cookie and in one small database row. When a 6th device signs in, the
// oldest login is dropped from the list; that device is signed out the next
// time it opens a page or its 30-second check runs.
import { docGet, docSet } from "./data";

export const MAX_ADMIN_DEVICES = 5;
const KEY = "admin-sessions";

export function newSid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function readList() {
  const doc = await docGet(KEY).catch(() => null);
  return Array.isArray(doc?.list) ? doc.list : [];
}

export async function registerAdminSession(sid, userAgent = "") {
  const list = await readList();
  const next = [...list.filter((s) => s.sid !== sid), { sid, createdAt: new Date().toISOString(), device: String(userAgent).slice(0, 80) }];
  while (next.length > MAX_ADMIN_DEVICES) next.shift(); // drop the oldest
  await docSet(KEY, { list: next });
}

export async function isAdminSessionValid(sid) {
  if (!sid) return false;
  const list = await readList();
  return list.some((s) => s.sid === sid);
}

export async function removeAdminSession(sid) {
  if (!sid) return;
  const list = await readList();
  await docSet(KEY, { list: list.filter((s) => s.sid !== sid) });
}

export async function listAdminSessions() {
  return readList();
}
