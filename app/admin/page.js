"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "../../components/PasswordInput";
import { COLORS } from "../../lib/theme";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("signedOut")) setSignedOut(true);
  }, []);

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
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);

    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, padding: 32, width: "100%", maxWidth: 360 }}>
        <img src="/emblem.png" alt="PEERS emblem" style={{ height: 44, marginBottom: 16 }} />
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 4px" }}>
          Admin sign in
        </p>
        <p style={{ fontSize: 13, color: "#7A7A70", margin: "0 0 24px" }}>The PEERS Education System</p>

        {signedOut && (
          <p style={{ fontSize: 12.5, color: "#7A6220", background: "#FCEFD6", borderRadius: 5, padding: "8px 10px", margin: "0 0 16px" }}>
            You were signed out because this account is already signed in on 5 other devices. Sign in again to continue.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>Username</label>
          <input
            name="username"
            type="text"
            placeholder="Enter admin username"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              fontSize: 13,
              border: "1px solid #DBD8CC",
              borderRadius: 5,
              marginBottom: 14,
            }}
          />
          <label style={{ display: "block", fontSize: 12, color: "#5A5A52", marginBottom: 5 }}>Password</label>
          <div style={{ marginBottom: error ? 8 : 20 }}>
            <PasswordInput name="password" placeholder="Enter admin password" />
          </div>
          {error && <p style={{ fontSize: 12, color: COLORS.red, margin: "0 0 14px" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: COLORS.red,
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "10px 0",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
