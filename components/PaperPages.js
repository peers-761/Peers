"use client";

// Shows the test paper exactly as uploaded (page pictures, top to bottom).
export default function PaperPages({ pages = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, userSelect: "none", WebkitUserSelect: "none" }}>
      {pages.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Paper page ${i + 1}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: "100%", height: "auto", display: "block", border: "1px solid #E4E1D6", background: "#fff" }}
        />
      ))}
    </div>
  );
}
