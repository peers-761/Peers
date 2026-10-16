import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { updateDB, RouteError } from "../../../../lib/data";
import { SESSION_COOKIE, readSessionValue } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value || "");
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const url = new URL(req.url);
    const rpID = url.hostname;

    const options = await updateDB(async (db) => {
      const cred = db.teacherCredentials?.[session.username];
      if (!cred) throw new RouteError(400, "No fingerprint registered yet.");

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "required",
        allowCredentials: [{ id: cred.id }],
      });

      if (!db.webauthnChallenges) db.webauthnChallenges = {};
      db.webauthnChallenges[session.username] = { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 };
      return options;
    });

    return NextResponse.json(options, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Something went wrong. Please try again." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
