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

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

export function paidOf(ch) {
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
  CLASSES.forEach((c) => (perClass[c] = { className: c, collected: 0, due: 0, students: [] }));
  const dueRows = {}; // studentId -> row
  const summary = { expected: 0, collected: 0, due: 0, vouchers: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 };

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
      summary.vouchers++;
      summary.expected += expected;
      summary.collected += paid;
      summary.due += due;
      if (expected > 0 && paid >= expected) summary.paidCount++;
      else if (paid > 0) summary.partialCount++;
      else summary.unpaidCount++;
      perClass[cls].collected += paid;
      perClass[cls].due += due;
      if (due > 0) {
        const key = studentId;
        if (!dueRows[key]) {
          dueRows[key] = {
            id: studentId,
            name: ch.studentName || st?.name || "",
            fatherName: ch.fatherName || st?.fatherName || "",
            className: cls,
            monthlyFee: Number(st?.fee ?? db.feeStructure?.[cls] ?? ch.items?.tuitionFee ?? 0),
            paid: 0,
            due: 0,
            phone: st?.parentPhone || "",
          };
          perClass[cls].students.push(dueRows[key]);
        }
        dueRows[key].paid += paid;
        dueRows[key].due += due;
      }
    }
  }

  const classes = CLASSES.map((c) => ({
    ...perClass[c],
    label: classLabel(c),
    students: perClass[c].students.sort((a, b) => b.due - a.due),
  }));
  return { year, monthly, classes, summary };
}
