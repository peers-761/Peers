// Shared logic for fee vouchers ("challans").
//
// A voucher is made of fixed FEE BLOCKS (Tuition, Security, Annual Fund...)
// stored in challan.items. The Incharge/Admin can change ANY block.
// totalDue is always the sum of the blocks.
//
// ARREARS (old unpaid fee) are merged automatically: for every month that
// is not yet paid, the previous month's full voucher total (if that month
// is still unpaid) is copied into this month's "Arrears" block. This is
// recalculated every time, so if an old month is later marked paid, or its
// amount is edited, the newer voucher follows automatically. If somebody
// types a custom Arrears amount by hand, it is kept (arrearsManual) until
// "Reset arrears to auto" is pressed.

import { pktMonthStr } from "./time";

export const FEE_ITEMS = [
  { key: "tuitionFee", label: "Tuition Fee" },
  { key: "security", label: "Security" },
  { key: "admissionFee", label: "Admission Fee" },
  { key: "arrears", label: "Arrears" },
  { key: "annualFund", label: "Annual Fund" },
  { key: "sportsFund", label: "Sports Fund" },
  { key: "tourFund", label: "Tour Fund" },
  { key: "labFund", label: "Lab Fund" },
  { key: "stationery", label: "Stationary/Books/Workbooks" },
  { key: "idCardCharges", label: "ID Card Charges" },
  { key: "acCharges", label: "AC Charges" },
];

export const FEE_KEYS = FEE_ITEMS.map((i) => i.key);

// The current month in Pakistan time, as YYYY-MM.
export function currentMonth() {
  return pktMonthStr();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function emptyItems() {
  const items = {};
  for (const k of FEE_KEYS) items[k] = 0;
  return items;
}

// Accepts anything (e.g. strings typed in a form) and returns a clean
// items object with every block as a non-negative whole number.
export function cleanItems(raw = {}) {
  const items = emptyItems();
  for (const k of FEE_KEYS) items[k] = num(raw?.[k]);
  return items;
}

export function sumItems(items) {
  return FEE_KEYS.reduce((t, k) => t + num(items?.[k]), 0);
}

function recalcTotals(challan) {
  // Fix the blocks IN PLACE (same object, same key order) so that running
  // this on an already-correct voucher changes nothing at all — the daily
  // job and the list page use that to know whether a save is needed.
  if (!challan.items) challan.items = {};
  for (const k of FEE_KEYS) challan.items[k] = num(challan.items[k]);
  challan.baseFee = challan.items.tuitionFee;
  challan.amount = challan.items.tuitionFee;
  challan.previousDues = challan.items.arrears;
  challan.totalDue = sumItems(challan.items);
}

// Older vouchers were saved as baseFee + previousDues + one edited
// total. Convert them once into the block layout.
export function normalizeChallan(challan) {
  if (!challan.items) {
    const base = num(challan.baseFee);
    const prev = num(challan.previousDues);
    const total = challan.totalDue === undefined ? base + prev : Number(challan.totalDue) || 0;
    const extra = total - base - prev;
    const items = emptyItems();
    items.tuitionFee = base;
    items.arrears = prev;
    if (extra > 0) {
      items.annualFund = extra;
    } else if (extra < 0) {
      const left = base + extra;
      items.tuitionFee = Math.max(0, left);
      if (left < 0) items.arrears = Math.max(0, prev + left);
    }
    challan.items = items;
  }
  recalcTotals(challan);
  return challan;
}

// Recomputes the Arrears block of every unpaid voucher of one student,
// oldest month first. Paid (verified) vouchers are never changed.
// How much of a voucher is still unpaid (handles part payments: if a
// parent paid 3000 of 5000, only 2000 is carried forward as arrears).
export function remainingOf(c) {
  const total = Number(c.totalDue) || 0;
  let paid = 0;
  if (Array.isArray(c.payments) && c.payments.length) paid = c.payments.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  else if (c.paidAmount !== undefined && c.paidAmount !== null && c.paidAmount !== "") paid = Number(c.paidAmount) || 0;
  else if (c.status === "verified") paid = total;
  return Math.max(0, total - paid);
}

export function refreshChain(db, studentId) {
  const byMonth = db.feeChallans?.[studentId];
  if (!byMonth) return;
  const months = Object.keys(byMonth).sort();
  let prev = null;
  for (const m of months) {
    const c = byMonth[m];
    normalizeChallan(c);
    if (c.status !== "verified" && !c.arrearsManual) {
      const owed = prev && prev.status !== "verified" ? remainingOf(prev) : 0;
      c.items.arrears = owed;
      recalcTotals(c);
    }
    prev = c;
  }
}

// Gets (or creates) a student's voucher for a month, with arrears merged.
export function getOrCreateChallan(db, className, studentId, student, month = currentMonth()) {
  if (!db.feeChallans) db.feeChallans = {};
  if (!db.feeChallans[studentId]) db.feeChallans[studentId] = {};

  let created = false;
  if (!db.feeChallans[studentId][month]) {
    const baseFee = num(student.fee ?? db.feeStructure?.[className] ?? 0);
    const items = emptyItems();
    items.tuitionFee = baseFee;
    db.feeChallans[studentId][month] = {
      studentId,
      className,
      studentName: student.name,
      fatherName: student.fatherName || "",
      rollNo: student.rollNo || "",
      section: student.section || "",
      month,
      items,
      status: "unpaid",
      receiptImage: null,
      createdAt: new Date().toISOString(),
    };
    created = true;
  }

  refreshChain(db, studentId);
  return { challan: db.feeChallans[studentId][month], created };
}

// Makes sure EVERY student has a voucher for this month and that all
// arrears are up to date. Safe to run again and again (it only changes
// what is missing/outdated).
export function syncAllChallans(db, month = currentMonth()) {
  for (const [className, students] of Object.entries(db.students || {})) {
    for (const student of students) {
      getOrCreateChallan(db, className, student.id, student, month);
    }
  }
}

// Bulk shortcut: put an amount into one fee block for many students at
// once (e.g. Annual Fund for the whole school). Paid vouchers are skipped.
// mode "set" (default) writes exactly that amount — safe to repeat.
// mode "add" adds on top of what is already there.
export function bulkApply(db, { field, amount, mode = "set", className = null, month = currentMonth() }) {
  if (!FEE_KEYS.includes(field)) throw new Error("Unknown fee block.");
  const value = num(amount);
  let updated = 0;
  let skippedPaid = 0;

  for (const [cls, students] of Object.entries(db.students || {})) {
    if (className && cls !== className) continue;
    for (const student of students) {
      const { challan } = getOrCreateChallan(db, cls, student.id, student, month);
      if (challan.status === "verified") {
        skippedPaid++;
        continue;
      }
      const current = challan.items[field] || 0;
      challan.items[field] = mode === "add" ? current + value : value;
      if (field === "arrears") challan.arrearsManual = true;
      recalcTotals(challan);
      challan.editedBy = "Bulk update";
      challan.editedAt = new Date().toISOString();
      updated++;
    }
  }

  const ids = new Set();
  for (const [cls, students] of Object.entries(db.students || {})) {
    if (className && cls !== className) continue;
    for (const s of students) ids.add(s.id);
  }
  for (const id of ids) refreshChain(db, id);

  return { updated, skippedPaid };
}
