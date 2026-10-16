"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { COLORS } from "../../../../../lib/theme";
import { resizeImage } from "../../../../../lib/imageResize";

export default function AbsenceReasonPage() {
  const { date } = useParams();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 1200, 0.85);
    setProofImage(dataUrl);
    setPreview(dataUrl);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNeedsLogin(false);
    if (!reason.trim()) {
      setError("Please select or write a reason.");
      return;
    }
    try {
      const res = await fetch("/api/absence-remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason, remarks, proofImage }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not submit. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError("Could not reach the server. Check your internet and try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "100%" }}>
        <p style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 18, color: COLORS.navy, margin: "0 0 6px" }}>
          Absence on {date}
        </p>
        {submitted ? (
          <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "16px 18px", marginTop: 16 }}>
            <p style={{ fontSize: 13.5, color: "#27500A", margin: 0 }}>
              Thank you — your reason has been sent to the teacher.
            </p>
            <button
              onClick={() => router.push("/parent/dashboard")}
              style={{ marginTop: 14, background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}
            >
              Back to dashboard
            </button>
          </div>
        ) : needsLogin ? (
          <div style={{ background: "#FCEFD6", border: "1px solid #E8CE8F", borderRadius: 8, padding: "16px 18px", marginTop: 16 }}>
            <p style={{ fontSize: 13.5, color: "#5A4300", margin: "0 0 12px" }}>
              You've been signed out. Please log in again to submit this reason — your answer above hasn't
              been lost, just log in and come back to this page.
            </p>
            <button
              onClick={() => router.push(`/parent?redirect=/parent/dashboard/absence/${date}`)}
              style={{ background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}
            >
              Log in again
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 20px" }}>
              Your child was marked absent today. Please let the teacher know why.
            </p>
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 14 }}
              >
                <option value="">Select a reason</option>
                <option value="Sick / Unwell">Sick / Unwell</option>
                <option value="Family emergency">Family emergency</option>
                <option value="Doctor's appointment">Doctor's appointment</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>

              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Additional remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 14, fontFamily: "inherit" }}
              />

              <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Proof / document (optional)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: 14, fontSize: 13 }} />
              {preview && <img src={preview} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 14 }} />}

              {error && <p style={{ fontSize: 12.5, color: COLORS.red, margin: "0 0 12px" }}>{error}</p>}

              <button
                type="submit"
                style={{ width: "100%", background: COLORS.red, color: "#fff", border: "none", borderRadius: 6, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Submit reason
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
