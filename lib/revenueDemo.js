// Dummy data for the Revenue Analysis page (same shape as /api/revenue),
// so the charts can be previewed before real fee data exists.
import { CLASSES } from "./theme";
import { classLabel } from "./revenue";

const FEES = [3000, 3000, 3000, 3200, 3200, 3500, 3500, 3800, 4000, 4200, 4200, 4500, 4800];
const COUNTS = [22, 25, 28, 40, 38, 36, 35, 34, 32, 30, 28, 26, 24];
const FATHERS = ["Muhammad Aslam", "Tariq Mehmood", "Rashid Ali", "Imran Khan", "Sajid Hussain", "Naveed Iqbal", "Farooq Ahmed", "Zahid Butt"];
const NAMES = ["Ali Raza", "Hamza Tariq", "Ayesha Noor", "Bilal Ahmed", "Zainab Fatima", "Usman Ghani", "Maryam Khan", "Hassan Ali", "Sana Iqbal", "Abdullah Shah"];

function rnd(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function demoRevenue(year, month) {
  const base = FEES.reduce((t, f, i) => t + f * COUNTS[i], 0); // ~ full month collection
  const monthly = {};
  [year, year - 1, year - 2].forEach((y, yi) => {
    const growth = 1 - yi * 0.13; // older years were smaller
    monthly[y] = Array.from({ length: 12 }, (_, m) => {
      const seasonal = m === 3 || m === 7 ? 1.25 : m === 5 || m === 6 ? 0.72 : 1; // admissions / summer break
      const noise = 0.9 + rnd(y * 13 + m * 7) * 0.2;
      return Math.round(base * 0.9 * growth * seasonal * noise);
    });
  });

  const classes = CLASSES.map((c, i) => {
    const n = COUNTS[i];
    const months = month === "all" ? 1 : 1;
    const expected = FEES[i] * n * months;
    const students = [];
    let collected = 0;
    let due = 0;
    for (let s = 0; s < n; s++) {
      const r = rnd(i * 100 + s + (month === "all" ? 0 : Number(month)));
      const fee = FEES[i] + (r > 0.85 ? 500 : r < 0.1 ? -300 : 0); // fees differ per student
      const paid = r < 0.6 ? fee : r < 0.72 ? Math.round(fee * (0.4 + r / 2)) : 0;
      collected += paid;
      if (fee - paid > 0) {
        due += fee - paid;
        students.push({
          id: `${c}-${s}`,
          name: NAMES[(s + i) % NAMES.length],
          fatherName: FATHERS[(s * 3 + i) % FATHERS.length],
          className: c,
          monthlyFee: fee,
          paid,
          due: fee - paid,
          phone: `03${(10 + ((i * 7 + s) % 40))}-${String(1000000 + Math.floor(rnd(i * 50 + s) * 8999999)).slice(0, 7)}`,
        });
      }
    }
    return { className: c, label: classLabel(c), collected, due, expected, students: students.sort((a, b) => b.due - a.due) };
  });
  return { year, monthly, classes };
}
