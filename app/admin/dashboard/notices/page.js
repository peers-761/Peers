"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS, formatDateTime } from "../../../../lib/theme";
import { resizeImage } from "../../../../lib/imageResize";

export default function NoticesAdminPage() {
  const [notices, setNotices] = useState([]);
  const [tag, setTag] = useState("Update");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function load() {
    const res = await fetch("/api/notices", { cache: "no-store" });
    setNotices(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      setImagePreview(null);
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await resizeImage(file);
      setImage(dataUrl);
      setImagePreview(dataUrl);
    } catch {
      alert("Could not process that image.");
    }
    setProcessing(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, text, image }),
    });
    setText("");
    setImage(null);
    setImagePreview(null);
    document.getElementById("notice-image-input").value = "";
    load();
  }

  async function handleDelete(id) {
    await fetch("/api/notices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <AdminShell title="Notices">
      <form onSubmit={handleAdd} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            style={{ padding: "9px 10px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
          >
            <option>Update</option>
            <option>Admissions</option>
            <option>Fee</option>
            <option>Event</option>
            <option>Holiday</option>
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write the announcement text"
            style={{ flex: 1, minWidth: 220, padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5 }}
          />
        </div>

        <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>
          Photo (optional, under 2MB)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <input id="notice-image-input" type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 12.5 }} />
          {processing && <span style={{ fontSize: 12, color: COLORS.muted }}>Processing...</span>}
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 5, border: `1px solid ${COLORS.border}` }} />
          )}
        </div>

        <button
          type="submit"
          style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          Post notice
        </button>
      </form>

      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {notices.map((n, i) => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}>
            {n.image ? (
              <img src={`/api/image?key=${n.image}`} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 5, background: COLORS.tint, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "#8A5B00", background: "#FCEFD6", padding: "3px 9px", borderRadius: 3 }}>{n.tag}</span>
            <p style={{ flex: 1, fontSize: 13.5, color: COLORS.ink, margin: 0 }}>{n.text}</p>
            <span style={{ fontSize: 12, color: "#9A9A90" }}>{formatDateTime(n.date)}</span>
            <button
              onClick={() => handleDelete(n.id)}
              style={{ background: "none", border: "none", color: COLORS.red, fontSize: 12.5, cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        ))}
        {notices.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No notices yet.</p>}
      </div>
    </AdminShell>
  );
}
