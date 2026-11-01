import { hmacSha256Hex, safeEqual } from "./hmac";

// Admin credentials. Best practice: set ADMIN_USERNAME and ADMIN_PASSWORD in
// Vercel -> Settings -> Environment Variables, so the password is NOT written
// in the code. The values below are only a fallback so the site keeps working
// until you do that. Keep the GitHub repo PRIVATE.
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "peers3311";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "031234567890*@";

// Cookie name used for admin, teacher, incharge and parent sessions.
export const SESSION_COOKIE = "peers_session";

// ---------------------------------------------------------------------
// Session cookie = <base64 of "role:username:timestamp[:sid]"> . <signature>
//
// The signature is an HMAC made with a secret that only the server knows
// (SESSION_SECRET — or, if you have not set it, your database address, which
// is also secret). Without it anybody could type their own cookie such as
// "admin:peers3311:..." and be treated as the admin. With it, a cookie that
// was not issued by this server is rejected. Cookies also expire after 30 days.
// ---------------------------------------------------------------------
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function secret() {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "peers-fallback-secret-please-set-SESSION_SECRET";
}

export function makeSessionValue(role, username, sid = "") {
  const raw = `${role}:${username}:${Date.now()}${sid ? ":" + sid : ""}`;
  const body = Buffer.from(raw).toString("base64");
  return `${body}.${hmacSha256Hex(secret(), body)}`;
}

export function readSessionValue(value) {
  try {
    if (!value || typeof value !== "string") return null;
    const dot = value.lastIndexOf(".");
    if (dot < 1) return null; // old unsigned cookies are not accepted any more
    const body = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    if (!safeEqual(sig, hmacSha256Hex(secret(), body))) return null;

    const raw = Buffer.from(body, "base64").toString("utf-8");
    const [role, username, ts, sid] = raw.split(":");
    if (!role || !username) return null;
    const issued = Number(ts);
    if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE_MS || issued > Date.now() + 5 * 60 * 1000) return null;
    return { role, username, sid: sid || null };
  } catch {
    return null;
  }
}
