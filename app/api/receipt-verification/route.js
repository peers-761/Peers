import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readDB, updateDB, RouteError } from "../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../lib/auth";
import {
  currentMonth,
  syncAllChallans,
  refreshChain,
  cleanItems,
  sumItems,
  bulkApply,
  FEE_KEYS,
} from "../../../lib/feeChallan";
import { sendPushToParent } from "../../../lib/push";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function requireStaff() {
  const cookieStore = cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
  if (!session || (session.role !== "admin" && session.role !== "incharge")) {
    return null;
  }
  return session;
}

// GET -> every student's vouchers, including students whose parent has
// never opened the Parent Portal — the office needs to be able to mark a
// walk-in cash payment for ANY child. Missing vouchers for the current
// month are created and arrears are kept up to date.
export async function GET() {
  const session = requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }

  try {
    const month = currentMonth();

    // Work on a private copy first; only touch the database if something
    // actually needs to be created or corrected.
    const db = await readDB();
    const before = JSON.stringify(db.feeChallans || {});
    syncAllChallans(db, month);
    if (JSON.stringify(db.feeChallans || {}) !== before) {
      await updateDB((fresh) => {
        syncAllChallans(fresh, month);
      });
    }

    const all = [];
    for (const [studentId, months] of Object.entries(db.feeChallans || {})) {
      for (const [m, challan] of Object.entries(months)) {
        all.push({ ...challan, studentId, month: m });
      }
    }

    all.sort((a, b) => ((a.submittedAt || a.createdAt) < (b.submittedAt || b.createdAt) ? 1 : -1));
    return NextResponse.json(all, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not load vouchers." }, { status: 500, headers: NO_STORE });
  }
}

// POST { studentId, month, status }              -> "verified" | "rejected" | "unpaid" | "pending"
// POST { studentId, month, items, resetArrears } -> edit any fee block on that voucher
// POST { bulk: { field, amount, mode, className } } -> put an amount into one fee block for many students
export async function POST(req) {
  const session = requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }

  const body = await req.json();
  const who = session.role === "incharge" ? "Incharge" : "Admin";

  // ---- Bulk shortcut (e.g. Annual Fund for everyone) ----
  if (body.bulk) {
    const { field, amount, mode, className } = body.bulk;
    if (!FEE_KEYS.includes(field)) {
      return NextResponse.json({ error: "Unknown fee block." }, { status: 400, headers: NO_STORE });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400, headers: NO_STORE });
    }
    try {
      const result = await updateDB((db) =>
        bulkApply(db, {
          field,
          amount: Number(amount),
          mode: mode === "add" ? "add" : "set",
          className: className || null,
          month: currentMonth(),
        })
      );
      return NextResponse.json(result, { headers: NO_STORE });
    } catch (err) {
      return NextResponse.json({ error: err.message || "Could not apply." }, { status: 500, headers: NO_STORE });
    }
  }

  // ---- Single voucher ----
  const { studentId, month, status, items, resetArrears, paidAmount } = body;

  if (status !== undefined && !["verified", "rejected", "unpaid", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400, headers: NO_STORE });
  }
  if (items !== undefined) {
    const bad = FEE_KEYS.some((k) => items[k] !== undefined && items[k] !== "" && (!Number.isFinite(Number(items[k])) || Number(items[k]) < 0));
    if (bad) {
      return NextResponse.json({ error: "Enter valid amounts (numbers, not negative).", }, { status: 400, headers: NO_STORE });
    }
  }

  let justVerified = false;
  try {
    const challan = await updateDB((db) => {
      const challan = db.feeChallans?.[studentId]?.[month];
      if (!challan) throw new RouteError(404, "Voucher not found.");
      refreshChain(db, studentId); // make sure it is in the block layout
      const wasVerified = challan.status === "verified";

      if (items !== undefined) {
        const clean = cleanItems(items);
        if (clean.arrears !== challan.items.arrears) challan.arrearsManual = true;
        for (const k of FEE_KEYS) challan.items[k] = clean[k];
        challan.editedBy = who;
        challan.editedAt = new Date().toISOString();
      }
      if (resetArrears) challan.arrearsManual = false;

      // Partial payment: office can record the amount actually received
      // (e.g. fee 5000, parent paid 3000). Revenue uses this exact amount.
      if (paidAmount !== undefined) {
        const n = Number(paidAmount);
        if (!Number.isFinite(n) || n < 0) throw new RouteError(400, "Enter a valid paid amount.");
        challan.paidAmount = Math.round(n);
      }
      if (status !== undefined) {
        if (status === "verified" && paidAmount === undefined && challan.paidAmount === undefined) {
          challan.paidAmount = sumItems(challan.items); // paid in full
        }
        if (status === "unpaid" || status === "rejected") delete challan.paidAmount;
        // Keep a small audit trail so a wrong "Paid" (or its undo) can always
        // be traced: who changed it, when, and from what to what.
        if (!Array.isArray(challan.statusHistory)) challan.statusHistory = [];
        if (challan.status !== status) {
          challan.statusHistory.push({ from: challan.status || "unpaid", to: status, by: who, at: new Date().toISOString() });
          if (challan.statusHistory.length > 30) challan.statusHistory = challan.statusHistory.slice(-30);
        }
        challan.status = status;
        challan.reviewedAt = new Date().toISOString();
        challan.reviewedBy = who;
        if (status === "verified" && !wasVerified) justVerified = true;
      }

      // Recalculate totals and let later months follow (e.g. marking this
      // month paid clears the arrears of the next month).
      challan.totalDue = sumItems(challan.items);
      refreshChain(db, studentId);
      return db.feeChallans[studentId][month];
    });

    // Tell the parent their payment went through — whether it was approved
    // from an online receipt upload or marked paid manually by the office,
    // this is the one place both paths meet (see the status handling
    // above), so a single notification here covers both.
    if (justVerified) {
      const amount = challan.paidAmount ?? challan.totalDue;
      // Awaited (not fire-and-forget) — on Vercel, an un-awaited promise
      // can get cut off the moment the response is sent.
      await sendPushToParent(studentId, {
        title: "Fee Payment Confirmed",
        body: `${challan.studentName || "Your child"}'s fee for ${month} (Rs. ${Number(amount).toLocaleString("en-PK")}) has been successfully received. Thank you!`,
        url: "/parent/dashboard/fee",
      });
    }

    return NextResponse.json(challan, { headers: NO_STORE });
  } catch (err) {
    const status2 = err.status || 500;
    return NextResponse.json({ error: err.message || "Could not save." }, { status: status2, headers: NO_STORE });
  }
}
