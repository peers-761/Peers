// Pieces of the Online Test system that both the server and the browser
// need (labels, marks calculation). No server-only imports here.

export const TEST_TYPES = [
  { value: "unit", label: "Unit Test (1 Chapter)" },
  { value: "quarter", label: "Quarter Test (3 Chapters)" },
  { value: "half", label: "Half Book Test" },
  { value: "full", label: "Full Book Test" },
];

export function testTypeLabel(value) {
  return TEST_TYPES.find((t) => t.value === value)?.label || value;
}

// severity "alert" counts as suspicious activity; "info" is only context.
export const FLAG_INFO = {
  tab_hidden: { label: "Left the test page (switched tab / app / minimised)", severity: "alert" },
  tab_returned: { label: "Came back to the test page", severity: "info" },
  focus_lost: { label: "Clicked outside the test window", severity: "alert" },
  fullscreen_exit: { label: "Exited full screen", severity: "alert" },
  camera_off: { label: "Camera turned off / blocked", severity: "alert" },
  camera_covered: { label: "Camera covered or very dark", severity: "alert" },
  no_face: { label: "No face visible in camera", severity: "alert" },
  multiple_faces: { label: "More than one face in camera", severity: "alert" },
  gaze_away: { label: "Eyes looking away from the screen for a while", severity: "alert" },
  mic_off: { label: "Microphone turned off / blocked", severity: "alert" },
  loud_noise: { label: "Talking or loud noise heard", severity: "alert" },
  paste_attempt: { label: "Tried to paste text", severity: "alert" },
  copy_attempt: { label: "Tried to copy text", severity: "alert" },
  print_attempt: { label: "Tried to print / take a screenshot / save the page", severity: "alert" },
  devtools_attempt: { label: "Tried to open browser developer tools", severity: "alert" },
  offline: { label: "Internet connection lost", severity: "info" },
  online: { label: "Internet connection back", severity: "info" },
  face_check_unavailable: { label: "Face check not supported on this device", severity: "info" },
  camera_unavailable: { label: "This device has no working camera (test taken without camera)", severity: "info" },
  camera_denied: { label: "Camera permission was refused (test taken without camera)", severity: "alert" },
  mic_unavailable: { label: "No microphone available on this device", severity: "info" },
};

export function flagLabel(type) {
  return FLAG_INFO[type]?.label || type;
}

export function isAlertFlag(type) {
  return FLAG_INFO[type]?.severity === "alert";
}

export function alertCounts(flags = []) {
  const counts = {};
  for (const f of flags) {
    if (isAlertFlag(f.type)) counts[f.type] = (counts[f.type] || 0) + 1;
  }
  return counts;
}

export function totalOutOf(test) {
  return (
    (Number(test.mcqCount) || 0) * (Number(test.marksMcq) || 0) +
    (Number(test.shortCount) || 0) * (Number(test.marksShort) || 0) +
    (Number(test.longCount) || 0) * (Number(test.marksLong) || 0)
  );
}

// MCQ marks when the admin entered an answer key; otherwise null (the
// teacher enters MCQ marks by hand).
export function autoMcqMarks(test, attempt) {
  const key = test.answerKey;
  if (!key || Object.keys(key).length === 0) return null;
  let right = 0;
  for (let i = 1; i <= test.mcqCount; i++) {
    if (key[i] && attempt.answers?.mcq?.[i] === key[i]) right++;
  }
  return right * (Number(test.marksMcq) || 0);
}

export function computeResult(test, attempt) {
  const marks = attempt.marks || {};
  const auto = autoMcqMarks(test, attempt);
  const mcq = auto !== null ? auto : Number(marks.mcq) || 0;
  let short = 0;
  for (let i = 1; i <= test.shortCount; i++) short += Number(marks[`S${i}`]) || 0;
  let long = 0;
  for (let i = 1; i <= test.longCount; i++) long += Number(marks[`L${i}`]) || 0;
  const obtained = mcq + short + long;
  const outOf = totalOutOf(test);
  const percentage = outOf > 0 ? Math.round((obtained / outOf) * 1000) / 10 : 0;
  const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F";
  return { mcq, short, long, obtained, outOf, percentage, grade };
}

export const SUBMIT_REASON_LABEL = {
  student: "Submitted by student",
  time: "Auto-submitted: time finished",
  disconnect: "Auto-submitted: connection lost / device off",
};

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur-roman", label: "Roman Urdu" },
];

// Splits an answer into words and spaces. Each word gets a number (wi) so
// the teacher's "mistake" marks can point at exact words.
export function tokenize(text) {
  const parts = String(text || "").split(/(\s+)/).filter((p) => p !== "");
  let wi = 0;
  let pos = 0;
  return parts.map((t) => {
    const isWord = !/^\s+$/.test(t);
    const tok = { t, isWord, wi: isWord ? wi : null, start: pos, end: pos + t.length };
    if (isWord) wi++;
    pos += t.length;
    return tok;
  });
}

// Counts words the teacher clicked as wrong, across every text answer.
export function mistakeCount(mistakes = {}) {
  let n = 0;
  for (const arr of Object.values(mistakes)) n += Array.isArray(arr) ? arr.length : 0;
  return n;
}

export function pktDay(iso) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}
