"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS, CLASSES } from "../../lib/theme";

export default function AdmissionsPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const childName = form.childName.value.trim();
    const className = form.className.value;
    const phone = form.phone.value.trim();

    if (!childName || !className || !phone) {
      setError("Please fill in all fields, including a phone number.");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childName, className, phone }),
    });

    setSubmitting(false);

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      <Header />
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>ADMISSIONS</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 16px" }}>
          Apply for admission
        </h1>
        <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 32px" }}>
          Fill in the form below and our office will contact you about the next steps and required
          documents.
        </p>

        {sent ? (
          <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "20px 24px" }}>
            <p style={{ fontSize: 14, color: "#27500A", margin: 0 }}>
              Thank you. Your inquiry has been received — our office will call you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Child's full name</label>
              <input
                name="childName"
                required
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: `1px solid #DBD8CC`, borderRadius: 5 }}
                placeholder="e.g. Ali Hassan"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Class applying for</label>
              <select
                name="className"
                required
                defaultValue=""
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: `1px solid #DBD8CC`, borderRadius: 5 }}
              >
                <option value="" disabled>Select a class</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {/^\d+$/.test(c) ? `Class ${c}` : c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>
                Parent/guardian phone number <span style={{ color: COLORS.red }}>*</span>
              </label>
              <input
                name="phone"
                required
                type="tel"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: `1px solid #DBD8CC`, borderRadius: 5 }}
                placeholder="03xx-xxxxxxx"
              />
            </div>

            {error && <p style={{ fontSize: 13, color: COLORS.red, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: COLORS.red,
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "12px 0",
                fontSize: 14.5,
                fontWeight: 500,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
                marginTop: 8,
              }}
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>

            <p style={{ fontSize: 12, color: "#9A9A90", lineHeight: 1.6, margin: "4px 0 0" }}>
              Note: submitting this form is just the first step and does not confirm admission. A parent
              or guardian will still need to visit the school in person to complete registration.
            </p>
          </form>
        )}
      </section>
      <Footer />
    </div>
  );
}
