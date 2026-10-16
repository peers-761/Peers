import { NextResponse } from "next/server";
import { saveImage } from "../../../../../lib/data";
import { getSession, getTest } from "../../../../../lib/onlineTests";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

// Admin uploads ONE page of the paper (already turned into an image in
// the browser). Returns the image key; the client collects the keys and
// then calls the "setPages" action.
export async function POST(req, { params }) {
  const session = getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not allowed." }, { status: 401, headers: NO_STORE });
  }
  const test = await getTest(params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404, headers: NO_STORE });
  if (test.status !== "draft") {
    return NextResponse.json({ error: "Pages can only be changed before the test is executed." }, { status: 400, headers: NO_STORE });
  }

  const { index, dataUrl } = await req.json();
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid page image." }, { status: 400, headers: NO_STORE });
  }
  const key = `otp-${test.id}-${Number(index) || 0}-${Date.now().toString(36)}`;
  try {
    await saveImage(key, dataUrl);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not save the page." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ key }, { headers: NO_STORE });
}
