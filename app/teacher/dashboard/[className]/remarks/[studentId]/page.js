"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COLORS } from "../../../../../../lib/theme";

export default function TeacherRemarksPage() {
  const { className, studentId } = useParams();
  const [remarks, setRemarks] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/teacher-remarks?studentId=${studentId}`, { cache: "no-store" });
    setRemarks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [studentId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/teacher-remarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, className, text }),
    });
    setText("");
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.tint }}>
      <div style={{ background: COLORS.navy, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#fff", fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Remarks</p>
        <a href={`/teacher/dashboard/${className}`} style={{ color: "#fff", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 5, textDecoration: "none" }}>
          Back
        </a>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
        <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12.5, color: COLORS.muted, marginBottom: 6 }}>Add a remark</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="e.g. Needs to focus more during class, doing well in group work..."
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 14, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 12, fontFamily: "inherit" }}
          />
          <button type="submit" style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Save remark
          </button>
        </form>

        {loading ? (
          <p style={{ fontSize: 13, color: COLORS.muted }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {remarks.map((r) => (
              <div key={r.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "14px 16px" }}>
                <p style={{ fontSize: 13.5, color: COLORS.ink, margin: "0 0 6px" }}>{r.text}</p>
                <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>
                  {r.teacherName} · {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
            {remarks.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>No remarks yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
