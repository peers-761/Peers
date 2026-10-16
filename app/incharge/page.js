"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "../../components/PasswordInput";
import { COLORS } from "../../lib/theme";

export default function InchargeLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      setError("Enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/incharge-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);

    if (res.ok) {
      router.push("/incharge/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 10, padding: 32, width: "100%", maxWidth: 360 }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 4px" }}>
          Incharge sign in
        </p>
        <p style={{ fontSize: 13, color: "#7A7A70", margin: "0 0 24px" }}>The PEERS Education System</p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>Username</label>
          <input
            name="username"
            type="text"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 14 }}
          />
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>Password</label>
          <div style={{ marginBottom: error ? 8 : 20 }}>
            <PasswordInput name="password" placeholder="Enter password" />
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
      </div>
    </div>
  );
}
