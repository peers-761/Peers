// Shared (client + server) math and helpers for the class-wide MONTHLY TEST
// reports that the Admin prepares for PTMs.
//
// A monthly test is one document:
//   { id, className, title, groups: [ group, ... ], createdAt, updatedAt }
// and each group is one printed table (e.g. "9th B3" science boys, "9th Arts"):
//   { id, label, section: "Boys"|"Girls"|"All",
//     subjects: [{ id, name, total }],
//     studentIds: [...],
//     marks: { [studentId]: { [subjectId]: number | "" } } }
//
// Obtained marks are typed in; OBT.M, %AGE and Grade are always calculated.
// A blank mark counts as 0 but the subject's total still counts — exactly
// like the school's Excel sheet (109 / 160 = 68%).

import { gradeFor } from "./testResultCalc";

export const DEFAULT_SUBJECTS_9_10 = ["English", "Urdu", "Islamiat", "Maths", "Physics", "Chemistry", "Biology / Computer"];

export function newId(prefix = "x") {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

export function defaultSubjects(names = DEFAULT_SUBJECTS_9_10, total = 20) {
  return names.map((name) => ({ id: newId("s"), name, total }));
}

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function groupTotal(group) {
  return (group.subjects || []).reduce((t, s) => t + (Number(s.total) || 0), 0);
}

// One student's row in one group.
export function computeRow(group, studentId) {
  const marks = group.marks?.[studentId] || {};
  let obtained = 0;
  let entered = 0;
  for (const s of group.subjects || []) {
    const n = num(marks[s.id]);
    if (n !== null) {
      obtained += n;
      entered++;
    }
  }
  const total = groupTotal(group);
  const hasAny = entered > 0;
  const percentage = hasAny && total > 0 ? Math.round((obtained / total) * 100) : null;
  return {
    obtained: hasAny ? obtained : null,
    total,
    percentage,
    grade: percentage === null ? "" : gradeFor(percentage),
    entered,
  };
}

// Rank (1 = best) of each student in the group, by obtained marks. Ties share a rank.
export function computeRanks(group) {
  const rows = (group.studentIds || []).map((id) => ({ id, obtained: computeRow(group, id).obtained }));
  const scored = rows.filter((r) => r.obtained !== null).sort((a, b) => b.obtained - a.obtained);
  const ranks = {};
  scored.forEach((r, i) => {
    ranks[r.id] = i > 0 && scored[i - 1].obtained === r.obtained ? ranks[scored[i - 1].id] : i + 1;
  });
  return ranks;
}

// Every monthly-test result of ONE student, as flat rows (used by the
// student profile and by the auto-remarks).
export function rowsForStudent(tests, studentId) {
  const out = [];
  for (const t of tests || []) {
    for (const g of t.groups || []) {
      if (!(g.studentIds || []).includes(studentId)) continue;
      const row = computeRow(g, studentId);
      if (row.obtained === null) continue;
      const marks = g.marks?.[studentId] || {};
      out.push({
        testId: t.id,
        title: t.title,
        groupLabel: g.label || "",
        className: t.className,
        createdAt: t.createdAt,
        obtained: row.obtained,
        total: row.total,
        percentage: row.percentage,
        grade: row.grade,
        subjects: (g.subjects || []).map((s) => ({
          name: s.name,
          total: Number(s.total) || 0,
          obtained: num(marks[s.id]),
        })),
      });
    }
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

// Plain-English remarks about one student, generated from their test rows
// (newest first) and, if known, their attendance percentage. Pure rules —
// no AI — so it works offline and is predictable.
export function autoRemarks({ name = "The student", rows = [], attendancePct = null }) {
  const first = String(name).split(" ")[0] || "The student";
  const lines = [];

  if (rows.length === 0) {
    if (attendancePct !== null) lines.push(attendanceLine(first, attendancePct));
    if (lines.length === 0) lines.push("No test results have been recorded yet, so there is nothing to comment on.");
    return lines.join(" ");
  }

  const latest = rows[0];
  const avg = Math.round(rows.reduce((t, r) => t + (r.percentage || 0), 0) / rows.length);

  if (avg >= 90) lines.push(`${first} is performing outstandingly, with an average of ${avg}% across ${plural(rows.length, "test")}.`);
  else if (avg >= 80) lines.push(`${first} is doing very well, with an average of ${avg}%.`);
  else if (avg >= 70) lines.push(`${first} is doing well, with an average of ${avg}%, and can reach the top band with a little more effort.`);
  else if (avg >= 60) lines.push(`${first} is performing satisfactorily (average ${avg}%), but there is clear room to improve.`);
  else if (avg >= 50) lines.push(`${first}'s performance is below expectations (average ${avg}%) and needs regular follow-up at home and at school.`);
  else lines.push(`${first} is struggling (average ${avg}%) and needs immediate attention, extra practice and a meeting with the parents.`);

  if (rows.length >= 2) {
    const diff = latest.percentage - rows[1].percentage;
    if (diff >= 5) lines.push(`The latest result (${latest.title}) is up ${diff} points compared with the previous test — a good improvement.`);
    else if (diff <= -5) lines.push(`The latest result (${latest.title}) is down ${Math.abs(diff)} points compared with the previous test; the reason should be looked into.`);
    else lines.push("Results have stayed steady compared with the previous test.");
  }

  // Subject-wise: average % per subject across all rows.
  const bySubject = {};
  for (const r of rows) {
    for (const s of r.subjects) {
      if (s.obtained === null || !s.total) continue;
      const key = s.name.trim().toLowerCase();
      if (!bySubject[key]) bySubject[key] = { name: s.name.trim(), got: 0, out: 0 };
      bySubject[key].got += s.obtained;
      bySubject[key].out += s.total;
    }
  }
  const subjects = Object.values(bySubject)
    .map((s) => ({ name: s.name, pct: Math.round((s.got / s.out) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  if (subjects.length >= 2) {
    const best = subjects.filter((s) => s.pct >= 80).slice(0, 2).map((s) => s.name);
    if (best.length) lines.push(`Strongest in ${list(best)}.`);
    const weak = subjects.filter((s) => s.pct < 60).slice(-3).reverse().map((s) => s.name);
    if (weak.length) lines.push(`Needs extra attention in ${list(weak)}.`);
    const failing = subjects.filter((s) => s.pct < 40).map((s) => s.name);
    if (failing.length) lines.push(`At risk of failing ${list(failing)} unless it improves soon.`);
  }

  if (attendancePct !== null) lines.push(attendanceLine(first, attendancePct));

  return lines.join(" ");
}

function attendanceLine(first, pct) {
  if (pct >= 90) return `Attendance is excellent (${pct}%).`;
  if (pct >= 75) return `Attendance is acceptable (${pct}%) but could be more regular.`;
  return `Attendance is low (${pct}%), which is likely affecting results; regular attendance is strongly advised.`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function list(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}
