"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "../../components/PasswordInput";
import { COLORS } from "../../lib/theme";

function ParentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const studentId = form.studentId.value.trim();
    const pin = form.pin.value.trim();

    if (!studentId || !pin) {
      setError("Enter both the roll number and PIN.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/parent-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, pin }),
    });
    setLoading(false);

    if (res.ok) {
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/parent") ? redirect : "/parent/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 32, width: "100%", maxWidth: 360 }}>
        <img src="/emblem.png" alt="PEERS emblem" style={{ height: 44, marginBottom: 16 }} />
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 4px" }}>
          Parent sign in
        </p>
        <p style={{ fontSize: 13, color: "#7A7A70", margin: "0 0 24px" }}>
          View your child's attendance and fee information
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>Roll Number / Student ID</label>
          <input
            name="studentId"
            type="text"
            placeholder="e.g. 25 or 9-01-1001"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 14 }}
          />
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>PIN</label>
          <div style={{ marginBottom: error ? 8 : 20 }}>
            <PasswordInput name="pin" placeholder="4-digit PIN" />
          </div>
          {error && <p style={{ fontSize: 12, color: COLORS.red, margin: "0 0 14px" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 0", fontSize: 13.5, fontWeight: 500, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={{ fontSize: 11.5, color: "#9A9A90", marginTop: 16, marginBottom: 0 }}>
          Your Roll Number and PIN were given to you by the school office.
        </p>
      </div>
    </div>
  );
}

export default function ParentLoginPage() {
  return (
    <Suspense fallback={null}>
      <ParentLoginForm />
    </Suspense>
  );
}
