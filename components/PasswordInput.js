"use client";

import { useState } from "react";

export default function PasswordInput({ name, placeholder, style }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "9px 42px 9px 12px",
          fontSize: 13,
          border: "1px solid #DBD8CC",
          borderRadius: 5,
          ...style,
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          color: "#7A7A70",
          padding: 4,
        }}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
