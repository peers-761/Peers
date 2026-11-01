// Revenue analytics — computed from the existing fee vouchers (challans).
//
// RULES (as requested):
//  * Revenue = money actually received. A voucher counts when it is
//    "verified" (Paid/Approved) or has a paidAmount > 0 (Partially Paid).
//    If a parent pays 3800, revenue is 3800 — never the fixed fee.
//  * paidAmount is stored on the voucher. Old vouchers without it: verified
//    = paid in full (totalDue), everything else = 0.
//  * Expected = totalDue minus the Arrears block (arrears are last month's
//    fee carried forward — counting them again would double count).
//  * Due = max(0, expected - paid).
import { CLASSES } from "./theme";
import { pktDateStr } from "./time";
import { remainingOf } from "./feeChallan";

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

// Every rupee received on a voucher, as dated entries. Vouchers saved
// before the ledger existed get ONE entry dated when they were marked paid.
export function paymentsOf(ch) {
  if (Array.isArray(ch.payments) && ch.payments.length) return ch.payments;
  const p = paidOf({ ...ch, payments: undefined });
  return p > 0 ? [{ amount: p, at: ch.reviewedAt || ch.createdAt || null, by: ch.reviewedBy || "", legacy: true }] : [];
}

export function paidOf(ch) {
  if (Array.isArray(ch.payments) && ch.payments.length) {
    return ch.payments.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  }
  if (ch.paidAmount !== undefined && ch.paidAmount !== null && ch.paidAmount !== "") {
    return Math.max(0, Number(ch.paidAmount) || 0);
  }
  return ch.status === "verified" ? Number(ch.totalDue) || 0 : 0;
}

export function expectedOf(ch) {
  const total = Number(ch.totalDue) || 0;
  const arrears = Number(ch.items?.arrears) || 0;
  return Math.max(0, total - arrears);
}

export function buildRevenue(db, year, month /* "all" | 1..12 */) {
  const years = [year, year - 1, year - 2];
  const monthly = {}; // year -> [12]
  years.forEach((y) => (monthly[y] = Array(12).fill(0)));

  const studentsById = {};
  for (const [cls, list] of Object.entries(db.students || {})) {
    for (const s of list) studentsById[s.id] = { ...s, className: cls };
  }

  const perClass = {};
  CLASSES.forEach(
    (c) =>
      (perClass[c] = {
        className: c, collected: 0, expected: 0, due: 0, previousDue: 0,
        paidCount: 0, partialCount: 0, unpaidCount: 0, oldCount: 0, oldMonths: [],
        students: [],
      })
  );
  const dueRows = {}; // studentId -> row
  const summary = { expected: 0, collected: 0, due: 0, previousDue: 0, vouchers: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 };
  const monthView = month !== "all";
  const monthLabel = (key) => {
    const [yy, mm] = key.split("-").map(Number);
    return MONTH_LABELS[mm - 1] + (yy !== year ? ` ${String(yy).slice(2)}` : "");
  };

  for (const [studentId, months] of Object.entries(db.feeChallans || {})) {
    const st = studentsById[studentId];
    for (const [m, ch] of Object.entries(months)) {
      const [yy, mm] = m.split("-").map(Number);
      const paid = paidOf(ch);
      if (monthly[yy]) monthly[yy][mm - 1] += paid;

      if (yy !== year) continue;
      if (month !== "all" && mm !== Number(month)) continue;
      const cls = ch.className || st?.className;
      if (!perClass[cls]) continue;
      const expected = expectedOf(ch);
      const due = Math.max(0, expected - paid);

      // OLD DUES: what is still unpaid from EARLIER months (it sits in this
      // voucher as arrears). Anything paid beyond this month's own fee goes
      // against the old money first. Only meaningful for ONE month — in the
      // full-year view the same money would be counted again in every month.
      let old = 0;
      const oldMonths = [];
      if (monthView && ch.status !== "verified") {
        old = Math.max(0, (Number(ch.items?.arrears) || 0) - Math.max(0, paid - expected));
        if (old > 0) {
          for (const m2 of Object.keys(months).sort()) {
            if (m2 < m && months[m2].status !== "verified" && remainingOf(months[m2]) > 0) oldMonths.push(monthLabel(m2));
          }
        }
      }

      const kind = expected > 0 && paid >= expected ? "paid" : paid > 0 ? "partial" : "unpaid";
      summary.vouchers++;
      summary.expected += expected;
      summary.collected += paid;
      summary.due += due;
      summary.previousDue += old;
      if (kind === "paid") summary.paidCount++;
      else if (kind === "partial") summary.partialCount++;
      else summary.unpaidCount++;

      const pc = perClass[cls];
      pc.collected += paid;
      pc.expected += expected;
      pc.due += due;
      pc.previousDue += old;
      if (kind === "paid") pc.paidCount++;
      else if (kind === "partial") pc.partialCount++;
      else pc.unpaidCount++;
      if (old > 0) {
        pc.oldCount++;
        oldMonths.forEach((l) => !pc.oldMonths.includes(l) && pc.oldMonths.push(l));
      }

      if (due > 0 || old > 0) {
        if (!dueRows[studentId]) {
          dueRows[studentId] = {
            id: studentId,
            name: ch.studentName || st?.name || "",
            fatherName: ch.fatherName || st?.fatherName || "",
            className: cls,
            monthlyFee: 0,
            paid: 0,
            due: 0,
            oldDue: 0,
            oldMonths: [],
            lastPaidOn: "",
            phone: st?.parentPhone || "",
          };
          pc.students.push(dueRows[studentId]);
        }
        const row = dueRows[studentId];
        row.monthlyFee += expected;
        row.paid += paid;
        row.due += due;
        row.oldDue += old;
        oldMonths.forEach((l) => !row.oldMonths.includes(l) && row.oldMonths.push(l));
        for (const p of paymentsOf(ch)) {
          if (!p.at) continue;
          const d = pktDateStr(new Date(p.at));
          if (d > row.lastPaidOn) row.lastPaidOn = d;
        }
      }
    }
  }

  const classes = CLASSES.map((c) => {
    const students = perClass[c].students
      .map((r) => ({
        ...r,
        total: r.due + r.oldDue,
        status: r.due === 0 && r.oldDue > 0 ? "old" : r.paid > 0 ? "partial" : "unpaid",
      }))
      .sort((a, b) => b.total - a.total);
    return { ...perClass[c], label: classLabel(c), students };
  });
  return { year, monthly, classes, summary };
}


// ---------------------------------------------------------------------
// Date-to-date collection report: money actually RECEIVED between two
// dates (by the day it was received, not by which month's fee it was for),
// who paid, and who still owes but paid nothing in that period.
// from / to are Pakistan dates, YYYY-MM-DD, both included.
// ---------------------------------------------------------------------
function eachDay(from, to) {
  const out = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function buildCollection(db, from, to) {
  const studentsById = {};
  for (const [cls, list] of Object.entries(db.students || {})) {
    for (const st of list) studentsById[st.id] = { ...st, className: cls };
  }

  const byDay = {};
  eachDay(from, to).forEach((d) => (byDay[d] = 0));
  const byClass = {};
  CLASSES.forEach((c) => (byClass[c] = { className: c, label: classLabel(c), received: 0, students: new Set() }));
  const payments = [];
  const paidStudentIds = new Set();
  let received = 0;

  for (const [studentId, months] of Object.entries(db.feeChallans || {})) {
    const st = studentsById[studentId];
    for (const [m, ch] of Object.entries(months)) {
      for (const p of paymentsOf(ch)) {
        const amount = Number(p.amount) || 0;
        if (!p.at || amount <= 0) continue;
        const day = pktDateStr(new Date(p.at));
        if (day < from || day > to) continue;
        const cls = ch.className || st?.className;
        received += amount;
        if (byDay[day] !== undefined) byDay[day] += amount;
        if (byClass[cls]) {
          byClass[cls].received += amount;
          byClass[cls].students.add(studentId);
        }
        paidStudentIds.add(studentId);
        payments.push({
          studentId,
          name: ch.studentName || st?.name || "",
          fatherName: ch.fatherName || st?.fatherName || "",
          className: cls,
          classLabel: classLabel(cls),
          month: m,
          amount,
          at: p.at,
          date: day,
          by: p.by || "",
        });
      }
    }
  }
  payments.sort((a, b) => (a.at < b.at ? 1 : -1));

  // Who still owes? Look at each student's LATEST voucher: its total already
  // carries every older unpaid month as arrears.
  const notPaid = [];
  let notPaidAmount = 0;
  let studentsWithDues = 0;
  for (const [studentId, months] of Object.entries(db.feeChallans || {})) {
    const st = studentsById[studentId];
    if (!st) continue;
    const keys = Object.keys(months).sort();
    const last = months[keys[keys.length - 1]];
    if (!last || last.status === "verified") continue;
    const owed = Math.max(0, (Number(last.totalDue) || 0) - paidOf(last));
    if (owed <= 0) continue;
    studentsWithDues++;
    if (paidStudentIds.has(studentId)) continue;
    notPaidAmount += owed;
    notPaid.push({
      id: studentId,
      name: last.studentName || st.name,
      fatherName: last.fatherName || st.fatherName || "",
      className: st.className,
      classLabel: classLabel(st.className),
      due: owed,
      phone: st.parentPhone || "",
    });
  }
  notPaid.sort((a, b) => b.due - a.due);

  return {
    from,
    to,
    received,
    paymentsCount: payments.length,
    paidStudents: paidStudentIds.size,
    studentsWithDues,
    notPaidCount: notPaid.length,
    notPaidAmount,
    byDay: Object.entries(byDay).map(([date, amount]) => ({ date, label: date.slice(8) + "/" + date.slice(5, 7), amount })),
    byClass: CLASSES.map((c) => ({ className: c, label: byClass[c].label, received: byClass[c].received, students: byClass[c].students.size })),
    payments: payments.slice(0, 1500),
    notPaid: notPaid.slice(0, 1500),
  };
}
