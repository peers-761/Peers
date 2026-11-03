"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COLORS } from "../lib/theme";

import { NAV } from "../lib/nav";

export default function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);

  // Thin reading-progress line under the header (updates once per frame).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      headerRef.current?.style.setProperty("--prog", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header ref={headerRef} className="site-header" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
      <div className="scroll-progress" aria-hidden="true" />
      <div
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 0 }}>
          <img src="/emblem.png" alt="PEERS emblem" style={{ height: 42, width: "auto", flexShrink: 0 }} />
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 15, color: COLORS.navy, whiteSpace: "nowrap" }}>
              The PEERS Education System
            </div>
            <div style={{ fontSize: 10.5, color: COLORS.red, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
              Primal Early Education Reforms School
            </div>
          </div>
        </Link>

        <nav style={{ display: "flex", gap: 26 }} className="desktop-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{ fontSize: 13.5, color: COLORS.ink, textDecoration: "none" }}>
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setOpen(!open)}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.navy }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{ fontSize: 14, color: COLORS.ink, textDecoration: "none" }}>
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
