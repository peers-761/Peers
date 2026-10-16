// Server-side helpers for the Online Test system.
//
// Storage layout (each is its own row so students never collide):
//   onlinetest:<testId>                  one document per test
//   onlineattempt:<testId>:<studentId>   one document per student attempt
// Paper pages are stored as images (see saveImage) under keys kept in
// test.pages.

import { cookies } from "next/headers";
import { docGet, docSet, docList, docDelete, readDB } from "./data";
import { SESSION_COOKIE, readSessionValue } from "./auth";

export function getSession() {
  const value = cookies().get(SESSION_COOKIE)?.value;
  return value ? readSessionValue(value) : null;
}

export function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const testKey = (id) => `onlinetest:${id}`;
const attemptKey = (testId, studentId) => `onlineattempt:${testId}:${studentId}`;

export const getTest = (id) => docGet(testKey(id));
export const saveTest = (test) => docSet(testKey(test.id), test);
export const deleteTestDoc = (id) => docDelete(testKey(id));

export async function listTests() {
  const rows = await docList("onlinetest:");
  return rows.map((r) => r.value).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export const getAttempt = (testId, studentId) => docGet(attemptKey(testId, studentId));
export const saveAttempt = (attempt) => docSet(attemptKey(attempt.testId, attempt.studentId), attempt);
export const deleteAttemptDoc = (testId, studentId) => docDelete(attemptKey(testId, studentId));

export async function listAttempts(testId) {
  const rows = await docList(`onlineattempt:${testId}:`);
  return rows.map((r) => r.value);
}

// draft -> live -> (time passes) closed -> published
export function testPhase(test, now = Date.now()) {
  if (test.status === "draft") return "draft";
  if (test.status === "published") return "published";
  return now < new Date(test.endsAt).getTime() ? "live" : "closed";
}

// After the test time is over, any attempt that was never submitted is
// submitted automatically with whatever was last saved. The reason tells
// the teacher whether the child simply ran out of time, or the
// connection / power was lost earlier.
export async function finalizeAttempts(test, attempts) {
  if (testPhase(test) !== "closed" && testPhase(test) !== "published") return attempts;
  const endMs = new Date(test.endsAt).getTime();
  for (const a of attempts) {
    if (a.submittedAt) continue;
    const lastSeenMs = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
    a.submittedAt = test.endsAt;
    a.submitReason = endMs - lastSeenMs > 90 * 1000 ? "disconnect" : "time";
    await saveAttempt(a);
  }
  return attempts;
}

// What a student is allowed to see about a test (never the answer key).
export function studentView(test) {
  return {
    id: test.id,
    title: test.title,
    type: test.type,
    subject: test.subject,
    className: test.className,
    durationMin: test.durationMin,
    mcqCount: test.mcqCount,
    shortCount: test.shortCount,
    longCount: test.longCount,
    pages: (test.pages || []).map((key) => `/api/image?key=${encodeURIComponent(key)}`),
    startedAt: test.startedAt,
    endsAt: test.endsAt,
  };
}

export async function findStudent(className, studentId) {
  const db = await readDB();
  const student = (db.students?.[className] || []).find((s) => s.id === studentId);
  return { db, student };
}
