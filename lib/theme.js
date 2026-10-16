export const COLORS = {
  navy: "#16215E",
  navyDark: "#0C1230",
  red: "#C8102E",
  gold: "#F0A500",
  cream: "#FCFCFA",
  tint: "#F3F1E9",
  ink: "#1B1B18",
  muted: "#5A5A52",
  border: "#E4E1D6",
};

// Classes taught, from Pre-Primary (PG) through Matric (10th).
export const CLASSES = ["Pre 1", "Pre 2", "Pre 3", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

// Formats a stored ISO date/timestamp as "12 Sep 2026, 3:45 PM" for
// display. Falls back gracefully for old date-only records too.
export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const hasTime = typeof value === "string" && value.includes("T");
  if (!hasTime) return datePart;
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}
