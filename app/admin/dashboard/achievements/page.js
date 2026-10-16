"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/AdminShell";
import { COLORS } from "../../../../lib/theme";
import { resizeImage } from "../../../../lib/imageResize";

export default function AchievementsAdminPage() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function load() {
    const res = await fetch("/api/achievements", { cache: "no-store" });
    setItems(await res.json());
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
      setError("Could not process that image.");
    }
    setProcessing(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!image && !text.trim()) {
      setError("Add a photo, a description, or both.");
      return;
    }
    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, text }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add achievement.");
      return;
    }
    setError("");
    setText("");
    setImage(null);
    setImagePreview(null);
    document.getElementById("achievement-image-input").value = "";
    load();
  }

  async function handleDelete(id) {
    await fetch("/api/achievements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <AdminShell title="Achievements">
      <p style={{ fontSize: 12.5, color: COLORS.muted, margin: "0 0 20px", maxWidth: 500 }}>
        Shown on the dedicated "Achievements" page (linked from the menu and footer) — a photo, a
        description, or both (neither
        is required on its own).
      </p>

      <form onSubmit={handleAdd} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Photo (optional)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <input id="achievement-image-input" type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 12.5 }} />
          {processing && <span style={{ fontSize: 12, color: COLORS.muted }}>Processing...</span>}
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 5, border: `1px solid ${COLORS.border}` }} />
          )}
        </div>
        <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Description (optional)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 1st place — Inter-school science fair, 2026"
          rows={3}
          style={{ width: "100%", maxWidth: 460, boxSizing: "border-box", padding: "9px 12px", fontSize: 13, border: "1px solid #DBD8CC", borderRadius: 5, marginBottom: 14, fontFamily: "inherit" }}
        />
        {error && <p style={{ fontSize: 12, color: COLORS.red, margin: "0 0 12px" }}>{error}</p>}
        <div>
          <button
            type="submit"
            style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Add achievement
          </button>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {items.map((a) => (
          <div key={a.id} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
            {a.image && <img src={`/api/image?key=${a.image}`} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />}
            <div style={{ padding: "8px 10px" }}>
              {a.text && <p style={{ fontSize: 12, color: COLORS.ink, margin: "0 0 6px" }}>{a.text}</p>}
              <button onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", color: COLORS.red, fontSize: 11.5, cursor: "pointer", padding: 0 }}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>No achievements added yet.</p>}
      </div>
    </AdminShell>
  );
}
