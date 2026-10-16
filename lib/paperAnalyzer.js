// Reads the raw text of an uploaded question-paper PDF and guesses, per
// question, whether it is an MCQ, a Short question, or a Long question —
// so the admin doesn't have to count them by hand.
//
// HOW IT WORKS (heuristic, not OCR of handwriting — works on a normal
// typed/Word-exported question paper):
//  1. Find where each question starts: a line beginning with "1.", "1)",
//     "Q1", "Q.1", etc.
//  2. Collect everything up to the next question as that question's block.
//  3. MCQ if the block contains 3+ option markers close together, e.g.
//     "(A) ... (B) ... (C) ... (D)" or "A) / B) / C) / D)".
//  4. Otherwise, look for a trailing mark hint like "[5]" or "(2 marks)".
//     <=3 marks (or no hint but a short block) => Short question.
//     >3 marks (or a long block) => Long question.
//  5. A "Section A: MCQs" / "Section B: Short Questions" / "Section C:
//     Long Questions" heading, if present, overrides the per-question
//     guess for everything under it — school papers are usually laid out
//     this way, and it is far more reliable than guessing line-by-line.
//
// This is a best-effort guess. The admin ALWAYS sees the detected list
// and can fix any question before saving — see the analyze-pdf route.

// Tolerant of "1.", "1)", "Q1.", "Q.1", "Q 1:", "Question 1 -", lowercase
// "q1", etc. — different question papers number things differently.
const QUESTION_START = /^\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[.):-]\s+(.*)$/i;
const OPTION_MARKER = /(?:\(?[A-Da-d]\)|\b[A-Da-d][.)])\s?/g;
const MARKS_HINT = /\[(\d{1,2})\]|\((\d{1,2})\s*(?:marks?|m)\)|—\s*(\d{1,2})\s*marks?/i;

const SECTION_HINTS = [
  { re: /(?:section|part)\s*[-:]?\s*(?:a|1)\b|multiple\s*choice|\bmcqs?\b|objective\s*type/i, type: "mcq" },
  { re: /(?:section|part)\s*[-:]?\s*(?:b|2)\b|short\s*questions?/i, type: "short" },
  { re: /(?:section|part)\s*[-:]?\s*(?:c|3)\b|long\s*questions?|detailed\s*questions?|extensive\s*questions?|essay\s*type/i, type: "long" },
];

function detectSection(line) {
  // Only treat as a section heading if it's a short, heading-like line
  // (not a normal sentence that happens to contain "short" or "long").
  if (line.length > 70) return null;
  for (const { re, type } of SECTION_HINTS) {
    if (re.test(line)) return type;
  }
  return null;
}

function countOptionMarkers(block) {
  const matches = block.match(OPTION_MARKER);
  return matches ? matches.length : 0;
}

function mode(arr) {
  if (!arr.length) return null;
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

export function analyzePaperText(rawText) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const starts = [];
  let currentSection = null;
  const sectionAt = [];
  for (let i = 0; i < lines.length; i++) {
    const sec = detectSection(lines[i]);
    if (sec) currentSection = sec;
    const m = QUESTION_START.exec(lines[i]);
    if (m) starts.push({ index: i, num: Number(m[1]), firstLine: m[2] });
    sectionAt.push(currentSection);
  }

  const questions = [];
  for (let q = 0; q < starts.length; q++) {
    const from = starts[q].index;
    const to = q + 1 < starts.length ? starts[q + 1].index : lines.length;
    const block = lines.slice(from, to).join(" ");
    const sectionGuess = sectionAt[from];

    const markHint = MARKS_HINT.exec(block);
    const marks = markHint ? Number(markHint[1] || markHint[2] || markHint[3]) : null;
    const optionHits = countOptionMarkers(block);

    let type;
    if (sectionGuess) {
      type = sectionGuess;
    } else if (optionHits >= 3) {
      type = "mcq";
    } else if (marks !== null) {
      type = marks <= 3 ? "short" : "long";
    } else {
      type = block.length < 140 ? "short" : "long";
    }

    questions.push({ number: starts[q].num, type, marks, text: block.slice(0, 160) });
  }

  const mcq = questions.filter((q) => q.type === "mcq");
  const short = questions.filter((q) => q.type === "short");
  const long = questions.filter((q) => q.type === "long");

  return {
    mcqCount: mcq.length,
    shortCount: short.length,
    longCount: long.length,
    marksMcq: mode(mcq.map((q) => q.marks).filter((n) => n)) || 1,
    marksShort: mode(short.map((q) => q.marks).filter((n) => n)) || 2,
    marksLong: mode(long.map((q) => q.marks).filter((n) => n)) || 5,
    totalQuestions: questions.length,
    questions,
    reliable: questions.length >= 3, // very few detected lines = probably a scanned/image PDF
  };
}
