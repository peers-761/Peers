// Brute-force protection for every login form.
// Too many wrong tries -> that account (and that internet address) is locked
// for 15 minutes. Counters live in small separate rows, not in the big data blob.
import { docGet, docSet } from "./data";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 8;
const MAX_PER_IP = 30;

function ipOf(req) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}
function clean(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
}
function keysFor(req, account) {
  return [
    { key: `loginguard:ip:${clean(ipOf(req)) || "x"}`, max: MAX_PER_IP },
    { key: `loginguard:acct:${clean(account)}`, max: MAX_PER_ACCOUNT },
  ];
}
async function load(key) {
  try { return (await docGet(key)) || null; } catch { return null; }
}

// Returns the minutes left if locked, otherwise 0.
export async function loginLockedMinutes(req, account) {
  const now = Date.now();
  for (const { key } of keysFor(req, account)) {
    const e = await load(key);
    if (e && e.until && e.until > now) return Math.max(1, Math.ceil((e.until - now) / 60000));
  }
  return 0;
}

export async function loginFailed(req, account) {
  const now = Date.now();
  for (const { key, max } of keysFor(req, account)) {
    let e = (await load(key)) || { n: 0, first: now };
    if (now - e.first > WINDOW_MS) e = { n: 0, first: now };
    e.n += 1;
    if (e.n >= max) e.until = now + WINDOW_MS;
    try { await docSet(key, e); } catch {}
  }
}

export async function loginSucceeded(req, account) {
  const [, acct] = keysFor(req, account);
  try { await docSet(acct.key, { n: 0, first: Date.now() }); } catch {}
}
