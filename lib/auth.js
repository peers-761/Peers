// Admin credentials — hardcoded on purpose, per project owner's request.
// IMPORTANT: keep the GitHub repo PRIVATE if you keep credentials here in
// plain text, otherwise anyone can read this file and log in as admin.
export const ADMIN_USERNAME = "peers3311";
export const ADMIN_PASSWORD = "031234567890*@";

// Cookie name used for both admin and teacher sessions.
export const SESSION_COOKIE = "peers_session";

// Very small, dependency-free "session token". It is NOT encrypted —
// it is just enough to remember who is logged in for this simple
// internal dashboard. Good enough for a small school admin panel,
// not meant for a high-security banking-style system.
// An optional 4th part, "sid", identifies one login on one device. The admin
// uses it so the school can limit how many devices are signed in at once
// (see lib/adminSessions.js).
export function makeSessionValue(role, username, sid = "") {
  const raw = `${role}:${username}:${Date.now()}${sid ? ":" + sid : ""}`;
  return Buffer.from(raw).toString("base64");
}

export function readSessionValue(value) {
  try {
    const raw = Buffer.from(value, "base64").toString("utf-8");
    const [role, username, , sid] = raw.split(":");
    if (!role || !username) return null;
    return { role, username, sid: sid || null };
  } catch {
    return null;
  }
}
