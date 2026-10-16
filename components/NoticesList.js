"use client";

import { useState } from "react";
import { COLORS, formatDateTime } from "../lib/theme";

export default function NoticesList({ notices }) {
  const [active, setActive] = useState(null);
  const [fullImage, setFullImage] = useState(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
        {notices.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setActive(item)}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: "16px 18px",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
              background: "#fff",
              border: "none",
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopStyle: "solid",
              borderTopColor: COLORS.border,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                background: COLORS.tint,
                flexShrink: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.image ? (
                <img src={`/api/image?key=${item.image}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 11, color: "#8A8A80", fontWeight: 500 }}>PEERS</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#8A5B00",
                  background: "#FCEFD6",
                  padding: "3px 9px",
                  borderRadius: 3,
                  display: "inline-block",
                  marginBottom: 6,
                }}
              >
                {item.tag}
              </span>
              <p
                style={{
                  fontSize: 13.5,
                  color: COLORS.ink,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {item.text}
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#8A8A80", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDateTime(item.date)}</span>
          </button>
        ))}
        {notices.length === 0 && <p style={{ padding: 18, fontSize: 13, color: COLORS.muted, margin: 0 }}>No notices yet.</p>}
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12,18,48,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 10,
              maxWidth: 480,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {active.image && (
              <img
                src={`/api/image?key=${active.image}`}
                alt=""
                onClick={() => setFullImage(`/api/image?key=${active.image}`)}
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderTopLeftRadius: 10, borderTopRightRadius: 10, cursor: "zoom-in" }}
              />
            )}
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#8A5B00",
                    background: "#FCEFD6",
                    padding: "4px 10px",
                    borderRadius: 3,
                  }}
                >
                  {active.tag}
                </span>
                <span style={{ fontSize: 12.5, color: "#8A8A80" }}>{formatDateTime(active.date)}</span>
              </div>
              <p style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.7, margin: 0 }}>{active.text}</p>
              <button
                onClick={() => setActive(null)}
                style={{ marginTop: 20, background: COLORS.navy, color: "#fff", border: "none", borderRadius: 5, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {fullImage && (
        <div
          onClick={() => setFullImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 200,
          }}
        >
          <img
            src={fullImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 4 }}
          />
          <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
            <a
              href={fullImage}
              download="peers-notice-image.jpg"
              onClick={(e) => e.stopPropagation()}
              style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 5, padding: "10px 22px", fontSize: 13.5, fontWeight: 500, textDecoration: "none" }}
            >
              Download image
            </a>
            <button
              onClick={() => setFullImage(null)}
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 5, padding: "10px 22px", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
