import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

// Uses the official @simplewebauthn/browser helpers to talk to the device's
// fingerprint/Face ID sensor. These stay in lockstep with whatever format
// @simplewebauthn/server expects, so upgrading either package never breaks
// the other side — no manual base64/buffer conversion to maintain here.

export async function registerFingerprint() {
  const optionsRes = await fetch("/api/webauthn/register-options", { method: "POST" });
  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Could not start registration.");
  }
  const optionsJSON = await optionsRes.json();

  let attestationResponse;
  try {
    attestationResponse = await startRegistration({ optionsJSON });
  } catch (err) {
    throw new Error(err?.message || "Fingerprint registration was cancelled.");
  }

  const verifyRes = await fetch("/api/webauthn/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attestationResponse),
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(data.error || "Could not verify fingerprint.");
  }
  return true;
}

export async function verifyFingerprint() {
  const optionsRes = await fetch("/api/webauthn/auth-options", { method: "POST" });
  if (!optionsRes.ok) {
    const data = await optionsRes.json().catch(() => ({}));
    throw new Error(data.error || "Could not start fingerprint check.");
  }
  const optionsJSON = await optionsRes.json();

  let assertionResponse;
  try {
    assertionResponse = await startAuthentication({ optionsJSON });
  } catch (err) {
    throw new Error(err?.message || "Fingerprint check was cancelled.");
  }

  const verifyRes = await fetch("/api/webauthn/auth-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assertionResponse),
  });
  if (!verifyRes.ok) {
    const data = await verifyRes.json().catch(() => ({}));
    throw new Error(data.error || "Fingerprint did not match.");
  }
  return true;
}

export function webAuthnSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}
