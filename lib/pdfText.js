// Extracts plain text from a PDF buffer, for the "Auto-detect from PDF"
// feature (see app/api/online-tests/analyze-pdf/route.js).
//
// WHY THE WORKER IS IMPORTED HERE: pdfjs-dist runs a "fake worker" in
// Node. By default it loads pdf.worker.mjs with a dynamic import() using a
// computed path, which Vercel's file tracer cannot see — so the file is
// left out of the deployed function and every call failed with
//   Setting up fake worker failed: Cannot find module '.../pdf.worker.mjs'
// pdfjs checks globalThis.pdfjsWorker first, so we import the worker with
// a STATIC import (which the bundler/tracer does include) and hand it over.
// Both imports must stay static, literal strings.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

if (!globalThis.pdfjsWorker) {
  globalThis.pdfjsWorker = pdfjsWorker;
}

export async function extractPdfText(buffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });
  const pdf = await loadingTask.promise;

  let text = "";
  const maxPages = Math.min(pdf.numPages, 30); // a test paper is never 30+ pages
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // IMPORTANT: pdfjs gives text as separate fragments with no built-in
    // line breaks — just joining every fragment on the page with a space
    // collapses the whole page into one giant line, which made question
    // numbers like "1." or "Q1." impossible to find (they're no longer at
    // the start of anything). Line breaks have to be reconstructed by
    // watching each fragment's vertical position: a changed Y means a new
    // line. This is the standard technique for pdfjs text extraction.
    let pageText = "";
    let lastY = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Array.isArray(item.transform) ? item.transform[5] : undefined;
      const isNewLine = lastY !== null && y !== undefined && Math.abs(y - lastY) > 2;
      if (isNewLine) {
        pageText += "\n";
      } else if (pageText && !pageText.endsWith("\n") && !pageText.endsWith(" ") && !item.str.startsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      if (item.hasEOL) pageText += "\n";
      if (y !== undefined) lastY = y;
    }
    text += pageText + "\n";
  }

  try {
    await pdf.destroy();
  } catch {
    // not fatal if cleanup fails
  }

  return text;
}
