"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../lib/theme";
import { NAV } from "../lib/nav";
import AnimatedUnderline from "./AnimatedUnderline";

const SOCIALS = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/the_peers_education_system",
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=100092534901505",
    svg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06C2 17.06 5.66 21.2 10.44 21.95V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.95C18.34 21.2 22 17.06 22 12.06Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [settings, setSettings] = useState({});
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <footer style={{ borderTop: `4px solid ${COLORS.gold}`, background: COLORS.navyDark }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "56px 24px 32px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 40,
              marginBottom: 40,
            }}
          >
            <div>
              <div style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", display: "inline-block", marginBottom: 14 }}>
                <img src="/logo-full.png" alt="The PEERS Education System" style={{ height: 68, width: "auto", display: "block" }} />
              </div>
              <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, color: "#fff", margin: 0 }}>
                We Take You Along
              </p>
              <AnimatedUnderline color={COLORS.red} width={150} />
              <p style={{ fontSize: 13, color: "#C6CBE0", lineHeight: 1.7, margin: "16px 0 0", maxWidth: 300 }}>
                The PEERS Education System — Primal Early Education Reforms School — quality education
                from PG through 10th class.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                {SOCIALS.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                    }}
                  >
                    {s.svg}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12.5, color: COLORS.gold, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 18px" }}>
                Quick Links
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} style={{ fontSize: 14.5, color: "#DCE0F0", textDecoration: "none" }}>
                    {n.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12.5, color: COLORS.gold, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 18px" }}>
                Contact
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {settings.address && <p style={{ fontSize: 14, color: "#DCE0F0", margin: 0, lineHeight: 1.6 }}>{settings.address}</p>}
                {settings.phone && <p style={{ fontSize: 14, color: "#DCE0F0", margin: 0 }}>{settings.phone}</p>}
                {settings.email && <p style={{ fontSize: 14, color: "#DCE0F0", margin: 0 }}>{settings.email}</p>}
                {!settings.phone && !settings.address && (
                  <p style={{ fontSize: 13, color: "#8A8FB0", margin: 0 }}>
                    Contact details will be added soon.
                  </p>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "#8A8FB0", margin: 0, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 20 }}>
            © {new Date().getFullYear()} The PEERS Education System — Primal Early Education Reforms School
          </p>
        </div>
      </footer>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          style={{
            position: "fixed",
            bottom: 24,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: COLORS.navy,
            color: "#fff",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(12,18,48,0.35)",
            zIndex: 50,
          }}
        >
          ↑
        </button>
      )}
    </>
  );
}
