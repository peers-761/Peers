import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
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

    const body = await req.json();
    const url = new URL(req.url);
    const rpID = url.hostname;
    const origin = url.origin;

    await updateDB(async (db) => {
      const stored = db.webauthnChallenges?.[session.username];
      if (!stored || stored.expiresAt < Date.now()) {
        throw new RouteError(400, "Registration expired, please try again.");
      }

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge: stored.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch (err) {
        throw new RouteError(400, "Fingerprint registration failed. Please try again.");
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw new RouteError(400, "Could not verify fingerprint.");
      }

      const { credential } = verification.registrationInfo;

      if (!db.teacherCredentials) db.teacherCredentials = {};
      db.teacherCredentials[session.username] = {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        registeredAt: new Date().toISOString(),
      };
      delete db.webauthnChallenges[session.username];
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Something went wrong. Please try again." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
