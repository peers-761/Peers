// Pure math shared by the report-entry form (live preview) and the API
// (final save) so the two never disagree.
//
//   totalObtained / totalOutOf — straight sums across every subject.
//   average       — average marks obtained per subject (not a %).
//   percentage    — totalObtained / totalOutOf, one decimal place.
//   grade         — school's standard letter-grade bands.
//   resultBar     — 0-100 value for drawing a visual result bar (same
//                   number as percentage, kept separate so the bar's
//                   fill/colour logic can change without touching the
//                   percentage figure itself).

export function gradeFor(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

export function computeReport(subjects) {
  const entries = Object.values(subjects || {});
  let totalObtained = 0;
  let totalOutOf = 0;
  for (const s of entries) {
    totalObtained += Number(s.obtained) || 0;
    totalOutOf += Number(s.total) || 0;
  }
  const percentage = totalOutOf > 0 ? Math.round((totalObtained / totalOutOf) * 1000) / 10 : 0;
  const average = entries.length > 0 ? Math.round((totalObtained / entries.length) * 10) / 10 : 0;
  return {
    totalObtained,
    totalOutOf,
    average, // average marks obtained per subject
    percentage,
    grade: gradeFor(percentage),
    resultBar: Math.max(0, Math.min(100, percentage)),
  };
}

export function gradeColor(grade) {
  if (grade === "A+" || grade === "A") return "#15803D";
  if (grade === "B") return "#4C9A2A";
  if (grade === "C") return "#F0A500";
  if (grade === "D") return "#C8102E";
  return "#8A1414";
}

export const REPORT_RETENTION_DAYS = 30;
