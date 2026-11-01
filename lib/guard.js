// One-line access checks for API routes.
//   const deny = await adminOnly(); if (deny) return deny;
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionValue } from "./auth";
import { requireAdmin } from "./monthlyAuth";

const NO_STORE = { "Cache-Control": "no-store" };

export function denied() {
  return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
}

// Only the signed-in admin (and a device that is still allowed to be signed in).
export async function adminOnly() {
  const s = await requireAdmin();
  return s ? null : denied();
}

// Admin, Incharge or Teacher.
export function staffOnly() {
  const s = readSessionValue(cookies().get(SESSION_COOKIE)?.value || "");
  return s && ["admin", "incharge", "teacher"].includes(s.role) ? null : denied();
}
