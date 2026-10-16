import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { SITE_URL } from "./seo";
import { sealCode } from "./voucherSeal";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function money(n) {
  if (!n) return "";
  return `Rs. ${Number(n).toLocaleString("en-PK")}/-`;
}

let cachedLogoBytes = null;
function getLogoBytes() {
  if (cachedLogoBytes) return cachedLogoBytes;
  try {
    cachedLogoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-full.png"));
  } catch (err) {
    cachedLogoBytes = null;
  }
  return cachedLogoBytes;
}

// Builds the official fee challan as an A4 PDF, laid out to match the
// school's existing printed "Fee Voucher - School Copy" paper form —
// same header, same info table, same description/amount rows, same
// notes and signature/stamp footer — so families see the exact same
// document they already recognize, just generated instead of handwritten.
export async function buildChallanPdf({
  studentName,
  fatherName,
  studentId,
  className,
  section,
  rollNo,
  month,
  items,
  totalDue,
  schoolName,
  status, // "verified" | "unpaid" | "pending" | "rejected"
  paidOn, // pre-formatted date string, e.g. "05 Oct 2026" — shown under the stamp
  paidAmount, // exact amount received — part of the security code
  siteUrl, // address the voucher was downloaded from — the QR must point here
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.55, 0.55, 0.55);

  const left = 40;
  const right = A4_WIDTH - 40;
  const contentWidth = right - left;
  let y = A4_HEIGHT - 44;

  // --- Header: logo + school name ---
  const logoBytes = getLogoBytes();
  if (logoBytes) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const logoW = 260;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      page.drawImage(logoImg, { x: (A4_WIDTH - logoW) / 2, y: y - logoH + 10, width: logoW, height: logoH });
      y -= logoH + 6;
    } catch (err) {
      page.drawText(schoolName || "THE PEERS EDUCATION SYSTEM", { x: left, y, size: 18, font: bold, color: black });
      y -= 26;
    }
  } else {
    page.drawText(schoolName || "THE PEERS EDUCATION SYSTEM", { x: left, y, size: 18, font: bold, color: black });
    y -= 26;
  }

  y -= 8;
  const titleText = "Fee Voucher - School Copy";
  const titleWidth = bold.widthOfTextAtSize(titleText, 13);
  page.drawText(titleText, { x: (A4_WIDTH - titleWidth) / 2, y, size: 13, font: bold, color: black });
  page.drawLine({ start: { x: (A4_WIDTH - titleWidth) / 2 - 4, y: y - 3 }, end: { x: (A4_WIDTH + titleWidth) / 2 + 4, y: y - 3 }, thickness: 0.75, color: black });
  y -= 24;

  // --- Info table: Name / Father's Name / Class / Section / Roll No / Month ---
  const infoTop = y;
  const rowH = 20;
  const infoRows = 4;
  const infoBottom = infoTop - rowH * infoRows;
  const col1 = left + 105; // end of label column 1
  const col2 = left + contentWidth * 0.62; // start of label column 2
  const col3 = col2 + 75; // end of label column 2

  // outer box
  page.drawRectangle({ x: left, y: infoBottom, width: contentWidth, height: infoTop - infoBottom, borderColor: line, borderWidth: 1 });
  // horizontal lines
  for (let i = 1; i < infoRows; i++) {
    const ly = infoTop - rowH * i;
    page.drawLine({ start: { x: left, y: ly }, end: { x: right, y: ly }, thickness: 0.75, color: line });
  }
  // vertical lines
  page.drawLine({ start: { x: col1, y: infoTop }, end: { x: col1, y: infoTop - rowH * 2 }, thickness: 0.75, color: line });
  page.drawLine({ start: { x: col2, y: infoTop }, end: { x: col2, y: infoBottom }, thickness: 0.75, color: line });
  page.drawLine({ start: { x: col3, y: infoTop }, end: { x: col3, y: infoTop - rowH * 2 }, thickness: 0.75, color: line });

  function infoCell(text, x, rowIndex, font = regular, size = 10.5) {
    const cellY = infoTop - rowH * rowIndex - rowH / 2 - 3.5;
    page.drawText(text || "", { x: x + 6, y: cellY, size, font, color: black });
  }

  infoCell("Name", left, 0, bold);
  infoCell(studentName, col1 + 6, 0);
  infoCell("Father's Name", left, 1, bold);
  infoCell(fatherName, col1 + 6, 1);
  infoCell("Class", left, 2, bold);
  infoCell(className, col1 + 6, 2);
  infoCell("Section", col2, 2, bold);
  infoCell(section, col3 + 6, 2);
  infoCell("Roll No", left, 3, bold);
  infoCell(rollNo, col1 + 6, 3);
  infoCell("Month", col2, 3, bold);
  infoCell(month, col3 + 6, 3);

  y = infoBottom - 24;

  // --- Description / Amount table ---
  const descRows = [
    ["Tuition Fee", items.tuitionFee],
    ["Security", items.security],
    ["Admission Fee", items.admissionFee],
    ["Arrears", items.arrears],
    ["Annual Fund", items.annualFund],
    ["Sports Fund", items.sportsFund],
    ["Tour Fund", items.tourFund],
    ["Lab Fund", items.labFund],
    ["Stationary/Books/Workbooks", items.stationery],
    ["ID Card Charges", items.idCardCharges],
    ["AC Charges", items.acCharges],
  ];

  const amountColX = left + contentWidth * 0.72;
  const descRowH = 19;
  const tableTop = y;
  const headerH = 22;
  const tableBottom = tableTop - headerH - descRowH * descRows.length - 24; // extra row for total

  page.drawRectangle({ x: left, y: tableBottom, width: contentWidth, height: tableTop - tableBottom, borderColor: line, borderWidth: 1 });
  page.drawLine({ start: { x: amountColX, y: tableTop }, end: { x: amountColX, y: tableBottom }, thickness: 0.75, color: line });
  page.drawLine({ start: { x: left, y: tableTop - headerH }, end: { x: right, y: tableTop - headerH }, thickness: 0.75, color: line });

  page.drawText("Description", { x: left + 8, y: tableTop - headerH / 2 - 4, size: 11, font: bold, color: black });
  page.drawText("Amount", { x: amountColX + 8, y: tableTop - headerH / 2 - 4, size: 11, font: bold, color: black });

  let rowY = tableTop - headerH;
  for (const [label, amount] of descRows) {
    page.drawText(label, { x: left + 8, y: rowY - descRowH / 2 - 3.5, size: 10, font: regular, color: black });
    if (amount) {
      page.drawText(money(amount), { x: amountColX + 8, y: rowY - descRowH / 2 - 3.5, size: 10, font: regular, color: black });
    }
    rowY -= descRowH;
    page.drawLine({ start: { x: left, y: rowY }, end: { x: right, y: rowY }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) });
  }

  // Total row
  page.drawLine({ start: { x: left, y: rowY }, end: { x: right, y: rowY }, thickness: 0.75, color: line });
  page.drawText("Total Amount Payable", { x: left + 8, y: rowY - 24 / 2 - 4, size: 11, font: bold, color: black });
  page.drawText(money(totalDue), { x: amountColX + 8, y: rowY - 24 / 2 - 4, size: 11, font: bold, color: black });

  y = tableBottom - 26;

  // --- Notes ---
  page.drawText("Note:", { x: left, y, size: 10.5, font: bold, color: black });
  y -= 16;
  const notes = [
    "All the charges must be deposited till 8th of this month.",
    "A fine of Rs. 20 per day will be charged in case of late submission.",
    "Keep this voucher safe for record and convenience.",
  ];
  for (const note of notes) {
    page.drawText(`•  ${note}`, { x: left + 8, y, size: 9.5, font: regular, color: gray });
    y -= 15;
  }

  // --- Signature / stamp footer ---
  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: left + 150, y }, thickness: 0.75, color: line });
  page.drawText("Accountant Signature", { x: left, y: y - 12, size: 9.5, font: italic, color: gray });

  page.drawLine({ start: { x: right - 150, y }, end: { x: right, y }, thickness: 0.75, color: line });
  page.drawText("Receiver Stamp", { x: right - 150, y: y - 12, size: 9.5, font: italic, color: gray });

  // --- "PAID" stamp, like a rubber stamp, only once the fee is actually
  // verified. Rotated and semi-transparent so the voucher underneath
  // stays fully readable. ---
  if (status === "verified") {
    const stampFont = bold;
    const green = rgb(0.11, 0.45, 0.2);
    const stampText = "PAID";
    const stampSize = 46;
    // Under the "Receiver Stamp" line — where a real rubber stamp would go —
    // so it never covers the student's details or the amounts.
    const cx = right - 120;
    const cy = y - 92;
    const textW = stampFont.widthOfTextAtSize(stampText, stampSize);

    page.drawText(stampText, {
      x: cx - textW / 2,
      y: cy,
      size: stampSize,
      font: stampFont,
      color: green,
      opacity: 0.55,
      rotate: degrees(-18),
    });

    const boxW = textW + 40;
    const boxH = stampSize + 26;
    page.drawRectangle({
      x: cx - boxW / 2,
      y: cy - 14,
      width: boxW,
      height: boxH,
      borderColor: green,
      borderWidth: 2.5,
      opacity: 0.55,
      rotate: degrees(-18),
    });

    if (paidOn) {
      const dateText = `Paid on ${paidOn}`;
      const dateSize = 10.5;
      const dateW = stampFont.widthOfTextAtSize(dateText, dateSize);
      page.drawText(dateText, {
        x: cx - dateW / 2,
        y: cy - 9,
        size: dateSize,
        font: stampFont,
        color: green,
        opacity: 0.6,
        rotate: degrees(-18),
      });
    }

    // --- Verification QR code — the actual tamper-proof part. ---
    // Anyone (parent, office, auditor) can scan this and see the LIVE
    // paid/unpaid status straight from the database. The "PAID" stamp
    // above is just a picture — a picture can be edited with an AI tool
    // onto any voucher. A QR code pointing at a live database check
    // cannot be faked that way: editing the image doesn't change what
    // the database says when the code is actually scanned. Drawn
    // upright (never rotated) so it always scans cleanly.
    try {
      const code = sealCode(studentId, month, paidAmount ?? totalDue);
      const base = (siteUrl || SITE_URL).replace(/\/$/, "");
      const verifyUrl = `${base}/verify-voucher?s=${encodeURIComponent(studentId)}&m=${encodeURIComponent(month)}&c=${encodeURIComponent(code)}`;
      const qrPng = await QRCode.toBuffer(verifyUrl, {
        type: "png",
        width: 240,
        margin: 1,
        color: { dark: "#16215E", light: "#FFFFFF" },
      });
      const qrImage = await pdfDoc.embedPng(qrPng);
      const qrSize = 56;
      const qrX = right - qrSize;
      // Bottom-right, beside the notes — a clean spot that never covers the
      // student details or the amount table.
      const qrY = tableBottom - 26 - qrSize + 4;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      page.drawText("Scan to verify", { x: qrX, y: qrY - 11, size: 7.5, font: italic, color: gray });

      // --- Small security seal + printed security code, left of the QR. ---
      // The code is calculated by the server with a secret key (see
      // lib/voucherSeal.js); the verify page checks it against the live
      // record, so a painted-on stamp without the right code is exposed.
      const navy = rgb(0.086, 0.129, 0.369);
      const sealR = 27;
      const sx = qrX - sealR - 22;
      const sy = qrY + qrSize / 2;
      page.drawCircle({ x: sx, y: sy, size: sealR, borderColor: navy, borderWidth: 1.4 });
      page.drawCircle({ x: sx, y: sy, size: sealR - 4, borderColor: navy, borderWidth: 0.5 });
      page.drawCircle({ x: sx, y: sy, size: sealR - 14, borderColor: navy, borderWidth: 0.5 });
      // fine rays between the inner and outer ring (hard to redraw exactly)
      for (let a = 0; a < 360; a += 15) {
        const rad = (a * Math.PI) / 180;
        page.drawLine({
          start: { x: sx + (sealR - 14) * Math.cos(rad), y: sy + (sealR - 14) * Math.sin(rad) },
          end: { x: sx + (sealR - 4) * Math.cos(rad), y: sy + (sealR - 4) * Math.sin(rad) },
          thickness: 0.4,
          color: navy,
        });
      }
      const tick = "PEERS";
      const tickW = bold.widthOfTextAtSize(tick, 5.5);
      page.drawText(tick, { x: sx - tickW / 2, y: sy + 1.5, size: 5.5, font: bold, color: navy });
      const paidTxt = "PAID";
      const paidW = bold.widthOfTextAtSize(paidTxt, 6);
      page.drawText(paidTxt, { x: sx - paidW / 2, y: sy - 6, size: 6, font: bold, color: navy });
      const codeLabel = `Code: ${code}`;
      const codeW = bold.widthOfTextAtSize(codeLabel, 7.5);
      page.drawText(codeLabel, { x: sx - codeW / 2, y: qrY - 11, size: 7.5, font: bold, color: navy });
    } catch {
      // Never let a QR-generation hiccup block the voucher itself from downloading.
    }
  }

  return pdfDoc.save();
}

// Converts an uploaded photo (JPEG/PNG) into a clean, single-page, A4 PDF
// at the image's own resolution (no extra downscaling), so it stays sharp
// when the office prints or zooms into it for verification.
export async function imageToPdf(imageBytes, contentType) {
  const pdfDoc = await PDFDocument.create();
  const image = contentType.includes("png")
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const maxW = A4_WIDTH - 60;
  const maxH = A4_HEIGHT - 60;
  const scale = Math.min(maxW / image.width, maxH / image.height, 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  page.drawImage(image, {
    x: (A4_WIDTH - drawWidth) / 2,
    y: (A4_HEIGHT - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });

  return pdfDoc.save();
}

// Builds a printable OMR-style answer sheet matching the paper's detected
// structure: a bubble grid (A/B/C/D) for every MCQ, and ruled, numbered
// blank space for every Short and Long question, with the marks for each
// question printed alongside it.
export async function buildAnswerSheetPdf({
  title, className, subject, mcqCount = 0, shortCount = 0, longCount = 0,
  marksMcq = 1, marksShort = 2, marksLong = 5, studentName = "", schoolName,
}) {
  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.6, 0.6, 0.6);
  const left = 40;
  const right = A4_WIDTH - 40;

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - 44;

  function header() {
    page.drawText(schoolName || "THE PEERS EDUCATION SYSTEM", { x: left, y, size: 15, font: bold, color: black });
    y -= 18;
    page.drawText("Answer Sheet", { x: left, y, size: 12, font: regular, color: gray });
    y -= 20;
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
    y -= 20;
    const info = [
      title ? `Test: ${title}` : null,
      className ? `Class: ${/^\d+$/.test(String(className)) ? "Class " + className : className}` : null,
      subject ? `Subject: ${subject}` : null,
    ].filter(Boolean).join("    ");
    page.drawText(info, { x: left, y, size: 10.5, font: regular, color: black });
    y -= 16;
    page.drawText(`Name: ${studentName || "_______________________________"}`, { x: left, y, size: 10.5, font: regular, color: black });
    page.drawText(`Roll No: ______________`, { x: right - 160, y, size: 10.5, font: regular, color: black });
    y -= 22;
  }

  function ensureSpace(need) {
    if (y - need < 50) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - 44;
    }
  }

  header();

  if (mcqCount > 0) {
    ensureSpace(30);
    page.drawText(`Section A — MCQs  (${mcqCount} x ${marksMcq} mark${marksMcq === 1 ? "" : "s"})`, { x: left, y, size: 11.5, font: bold, color: black });
    y -= 18;
    const colWidth = (right - left) / 2;
    for (let i = 0; i < mcqCount; i++) {
      ensureSpace(20);
      const col = i % 2;
      const x = left + col * colWidth;
      if (col === 0 && i > 0) y -= 20;
      const qy = y;
      page.drawText(`${i + 1}.`, { x, y: qy, size: 10.5, font: regular, color: black });
      const bubbleStartX = x + 22;
      ["A", "B", "C", "D"].forEach((letter, j) => {
        const bx = bubbleStartX + j * 34;
        page.drawCircle({ x: bx, y: qy + 3, size: 7, borderWidth: 1, borderColor: black, color: rgb(1, 1, 1) });
        page.drawText(letter, { x: bx - 3, y: qy - 1, size: 8, font: regular, color: black });
      });
      if (col === 1) y -= 0;
    }
    y -= 26;
  }

  function ruledSection(count, marks, label) {
    if (count <= 0) return;
    ensureSpace(30);
    page.drawText(`${label}  (${count} x ${marks} marks)`, { x: left, y, size: 11.5, font: bold, color: black });
    y -= 18;
    for (let i = 0; i < count; i++) {
      const linesFor = marks > 3 ? 6 : 2;
      ensureSpace(16 + linesFor * 16);
      page.drawText(`Q${i + 1}.`, { x: left, y, size: 10, font: bold, color: black });
      page.drawText(`[${marks}]`, { x: right - 30, y, size: 9.5, font: regular, color: gray });
      y -= 14;
      for (let l = 0; l < linesFor; l++) {
        page.drawLine({ start: { x: left + 6, y }, end: { x: right, y }, thickness: 0.6, color: line });
        y -= 16;
      }
      y -= 4;
    }
    y -= 8;
  }

  ruledSection(shortCount, marksShort, "Section B — Short Questions");
  ruledSection(longCount, marksLong, "Section C — Long Questions");

  return pdfDoc.save();
}
