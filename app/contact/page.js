"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS } from "../../lib/theme";

export default function ContactPage() {
  const [settings, setSettings] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const message = form.message.value.trim();

    if (!name || !message) {
      setError("Please enter your name and a message.");
      return;
    }

    setSubmitting(true);
    setError("");
    await fetch("/api/contact-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, message }),
    });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div>
      <Header />
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>CONTACT</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 24px" }}>
          Get in touch
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          {settings.address && (
            <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, margin: 0 }}>
              <strong style={{ color: COLORS.ink }}>Address</strong>
              <br />
              {settings.address}
            </p>
          )}
          {settings.phone && (
            <p style={{ fontSize: 15, color: COLORS.muted, margin: 0 }}>
              <strong style={{ color: COLORS.ink }}>Phone</strong>
              <br />
              {settings.phone}
            </p>
          )}
          {settings.whatsapp && (
            <p style={{ fontSize: 15, color: COLORS.muted, margin: 0 }}>
              <strong style={{ color: COLORS.ink }}>WhatsApp</strong>
              <br />
              {settings.whatsapp}
            </p>
          )}
          {settings.email && (
            <p style={{ fontSize: 15, color: COLORS.muted, margin: 0 }}>
              <strong style={{ color: COLORS.ink }}>Email</strong>
              <br />
              {settings.email}
            </p>
          )}
        </div>

        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 19, color: COLORS.navy, margin: "0 0 16px" }}>
          Send us a message
        </p>

        {sent ? (
          <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "20px 24px" }}>
            <p style={{ fontSize: 14, color: "#27500A", margin: 0 }}>Thank you — your message has been sent to our office.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Your name</label>
              <input name="name" required style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Phone number (optional)</label>
              <input name="phone" type="tel" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Message</label>
              <textarea name="message" required rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5, fontFamily: "inherit", resize: "vertical" }} />
            </div>
            {error && <p style={{ fontSize: 13, color: COLORS.red, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "11px 0", fontSize: 14, fontWeight: 500, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </section>
      <Footer />
    </div>
  );
}
