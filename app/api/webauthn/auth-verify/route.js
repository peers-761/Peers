import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
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
      const cred = db.teacherCredentials?.[session.username];

      if (!stored || stored.expiresAt < Date.now() || !cred) {
        throw new RouteError(400, "Fingerprint check expired, please try again.");
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body,
          expectedChallenge: stored.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: cred.id,
            publicKey: Buffer.from(cred.publicKey, "base64url"),
            counter: cred.counter,
          },
        });
      } catch (err) {
        throw new RouteError(400, "Fingerprint did not match.");
      }

      if (!verification.verified) {
        throw new RouteError(400, "Fingerprint did not match.");
      }

      cred.counter = verification.authenticationInfo.newCounter;
      delete db.webauthnChallenges[session.username];
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || "Something went wrong. Please try again." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
