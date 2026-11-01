import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDB } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";
import { syncAllChallans } from "../../../../lib/feeChallan";
import { deleteImage } from "../../../../lib/data";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// POST — admin only. Wipes ALL fee-voucher history (every month, every
// student) and immediately creates a fresh, unpaid voucher for the
// CURRENT month for every currently-enrolled student, using their
// current fee. Revenue Analysis is entirely voucher-driven (see
// lib/revenue.js), so from this moment revenue is generated only from
// what happens from here on — today's real students, today's real
// paid/unpaid status. This cannot be undone.
export async function POST() {
  const session = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Only the admin can reset revenue." }, { status: 403, headers: NO_STORE });
  }

  const result = await updateDB((db) => {
    const studentCount = Object.values(db.students || {}).reduce((t, list) => t + list.length, 0);

    // Remember every receipt photo / PDF of the vouchers being wiped, so the
    // files themselves can be removed from Cloudflare too (otherwise they
    // would stay there forever with nothing pointing to them).
    const imageKeys = [];
    for (const months of Object.values(db.feeChallans || {})) {
      for (const ch of Object.values(months)) {
        if (ch.receiptImage) imageKeys.push(ch.receiptImage);
        if (ch.receiptPdf) imageKeys.push(ch.receiptPdf);
        for (const h of ch.receiptHistory || []) {
          if (h.image) imageKeys.push(h.image);
          if (h.pdf) imageKeys.push(h.pdf);
        }
      }
    }

    db.feeChallans = {};
    syncAllChallans(db); // fresh, unpaid, current-month voucher per current student

    if (!db.settings) db.settings = {};
    db.settings.revenueResetAt = new Date().toISOString();
    db.settings.revenueResetBy = session.username;

    return { studentCount, imageKeys };
  });

  for (const key of new Set(result.imageKeys)) {
    await deleteImage(key).catch(() => {});
  }
  delete result.imageKeys;

  return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
}
