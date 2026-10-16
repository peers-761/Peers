import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/onlineTests";
import { analyzePaperText } from "../../../../lib/paperAnalyzer";
import { extractPdfText } from "../../../../lib/pdfText";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// POST { dataUrl: "data:application/pdf;base64,..." }  (admin only)
// Extracts the paper's text and guesses how many MCQ / Short / Long
// questions it has, so the admin doesn't have to count and type them by
// hand. Works on a normal typed/exported PDF; a scanned photo of a paper
// has no extractable text, so this returns reliable:false and the admin
// falls back to typing the counts in themselves.
export async function POST(req) {
  const session = getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  }

  const { dataUrl } = await req.json();
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    return NextResponse.json({ error: "Please upload the paper as a PDF file." }, { status: 400, headers: NO_STORE });
  }

  try {
    const buffer = Buffer.from(match[1], "base64");
    const text = await extractPdfText(buffer);
    const result = analyzePaperText(text);
    if (!result.reliable) {
      return NextResponse.json(
        {
          ...result,
          warning:
            "Could not find enough numbered questions in this PDF (it may be a scanned image rather than typed text, or the questions aren't numbered like \"1.\", \"2.\"). Please check / enter the counts yourself.",
        },
        { headers: NO_STORE }
      );
    }
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    // Surface the real reason (visible in the admin UI's detail line and
    // in Vercel's function logs) instead of a generic message — this is
    // the only way to debug a PDF-reading failure without server access.
    return NextResponse.json(
      { error: "Could not read that PDF.", detail: err?.message || String(err) },
      { status: 500, headers: NO_STORE }
    );
  }
}
