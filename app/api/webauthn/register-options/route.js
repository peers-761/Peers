import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { updateDB } from "../../../../lib/data";
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
      const teacher = db.teachers.find((t) => t.username === session.username);

      const options = await generateRegistrationOptions({
        rpName: "The PEERS Education System",
        rpID,
        userName: session.username,
        userDisplayName: teacher?.name || session.username,
        attestationType: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
      });

      if (!db.webauthnChallenges) db.webauthnChallenges = {};
      db.webauthnChallenges[session.username] = { challenge: options.challenge, expiresAt: Date.now() + 5 * 60 * 1000 };
      return options;
    });

    return NextResponse.json(options, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Something went wrong. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
