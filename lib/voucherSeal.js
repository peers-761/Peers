// Security seal for PAID fee vouchers.
//
// A "PAID" stamp on a PDF is only a picture — anybody (or any AI image tool)
// can paint it onto an unpaid voucher. So every paid voucher also carries a
// short SECURITY CODE that is calculated with a secret key that only the
// server knows. The code depends on the student, the month and the exact
// amount paid, so it cannot be guessed or copied from one voucher to another.
// The public verify page (/verify-voucher) recalculates the code and tells
// whether the code printed on the voucher is real.
//
// Set VOUCHER_SECRET (any long random text) in Vercel -> Settings ->
// Environment Variables. If it is missing, CRON_SECRET is used, and if that
// is missing too a built-in key is used (works, but is weaker).

import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read and type

function secret() {
  return process.env.VOUCHER_SECRET || process.env.CRON_SECRET || "peers-voucher-seal-v1";
}

export function sealCode(studentId, month, paidAmount) {
  const data = `${studentId}|${month}|${Math.round(Number(paidAmount) || 0)}`;
  const digest = crypto.createHmac("sha256", secret()).update(data).digest();
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[digest[i] % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function sealMatches(code, studentId, month, paidAmount) {
  const given = normalizeCode(code);
  if (given.length !== 8) return false;
  const real = normalizeCode(sealCode(studentId, month, paidAmount));
  const a = Buffer.from(given);
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
