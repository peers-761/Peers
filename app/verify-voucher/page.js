"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COLORS } from "../../lib/theme";

function classLabel(c) {
  return /^\d+$/.test(c) ? `Class ${c}` : c;
}

function VerifyBody() {
  const params = useSearchParams();
  const s = params.get("s");
  const m = params.get("m");
  const c = params.get("c") || "";
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [activeCode, setActiveCode] = useState(c);

  useEffect(() => {
    if (!s || !m) {
      setError("This link is missing its voucher reference.");
      return;
    }
    const qs = `s=${encodeURIComponent(s)}&m=${encodeURIComponent(m)}${activeCode ? `&c=${encodeURIComponent(activeCode)}` : ""}`;
    fetch(`/api/verify-voucher?${qs}`, { cache: "no-store" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setResult(d) : setError(d.error || "Could not verify this voucher.")))
      .catch(() => setError("Could not reach the server. Check your internet connection."));
  }, [s, m, activeCode]);

  const isPaid = result?.status === "verified";
  // Paid in the database AND the printed security code is the real one.
  const sealOk = isPaid && result?.codeChecked && result?.codeMatch;
  const sealBad = isPaid && result?.codeChecked && !result?.codeMatch;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 10px 30px rgba(22,33,94,0.08)" }}>
        <img src="/emblem.png" alt="The PEERS Education System" style={{ height: 52, margin: "0 auto 18px" }} />
        <p style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 0.4, margin: "0 0 20px", textTransform: "uppercase" }}>
          Official Fee Voucher Verification
        </p>

        {error ? (
          <p style={{ fontSize: 14, color: COLORS.red, margin: 0 }}>{error}</p>
        ) : !result ? (
          <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>Checking our records…</p>
        ) : (
          <>
            <div
              style={{
                width: 76, height: 76, borderRadius: "50%", margin: "0 auto 18px",
                background: isPaid ? "#EAF3DE" : "#FCEBEB",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, color: isPaid ? "#15803D" : COLORS.red,
              }}
            >
              {isPaid ? "✓" : "✕"}
            </div>
            <p style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 19, color: isPaid ? "#15803D" : COLORS.red, margin: "0 0 6px" }}>
              {isPaid ? "Genuinely Marked Paid" : "Not Marked Paid"}
            </p>
            <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 22px" }}>
              {isPaid
                ? "This exact record is Paid in The PEERS Education System's live database."
                : "Our records currently show this voucher as not paid. If you believe this is a mistake, please contact the school office."}
            </p>

            <div style={{ textAlign: "left", borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Student" value={result.studentName} />
              <Row label="Class" value={classLabel(result.className)} />
              <Row label="Month" value={result.month} />
              {isPaid && <Row label="Amount Paid" value={`Rs. ${Number(result.paidAmount || 0).toLocaleString("en-PK")}`} />}
              {isPaid && result.paidOn && (
                <Row label="Paid On" value={new Date(result.paidOn).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" })} />
              )}
            </div>
          </>
        )}

        {result && isPaid && (
          <div style={{ marginTop: 18, textAlign: "left", background: sealOk ? "#EAF3DE" : sealBad ? "#FCEBEB" : COLORS.tint, border: `1px solid ${sealOk ? "#B7D79A" : sealBad ? "#F2B8B8" : COLORS.border}`, borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: sealOk ? "#27500A" : sealBad ? "#791F1F" : COLORS.navy }}>
              {sealOk ? "✓ Security code is genuine" : sealBad ? "✕ Security code does NOT match" : "Check the security code"}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.muted }}>
              {sealOk
                ? "The code printed on the voucher is the real one for this payment."
                : sealBad
                ? "The code on the voucher you are holding is wrong. Do not trust that voucher — it may be edited or fake."
                : "Every genuine paid voucher has a code like ABCD-EFGH printed next to its small round seal. Type it here to confirm."}
            </p>
            {!sealOk && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  placeholder="ABCD-EFGH"
                  maxLength={9}
                  style={{ flex: 1, padding: "8px 10px", fontSize: 14, letterSpacing: 1, border: "1px solid #DBD8CC", borderRadius: 5, textAlign: "center" }}
                />
                <button onClick={() => typed.trim() && setActiveCode(typed.trim())} style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
                  Check
                </button>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 10.5, color: "#9A9A90", marginTop: 24 }}>
          This page always reflects the school's live records — it cannot be faked by editing a PDF or image.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12.5, color: COLORS.muted }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.ink, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function VerifyVoucherPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: COLORS.tint }} />}>
      <VerifyBody />
    </Suspense>
  );
}
