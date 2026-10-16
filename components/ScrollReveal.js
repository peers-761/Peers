"use client";

import { useEffect, useRef, useState } from "react";

// Wraps any content and fades + slides it into place the moment it scrolls
// into view (once — it doesn't replay every time you scroll past it).
// Usage: <ScrollReveal delay={0.15}><img ... /></ScrollReveal>
export default function ScrollReveal({ children, delay = 0, direction = "up", style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If a visitor's device prefers reduced motion, just show it immediately.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform =
    direction === "left" ? "translateX(-26px)" :
    direction === "right" ? "translateX(26px)" :
    direction === "scale" ? "scale(0.94)" :
    "translateY(26px)";

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : hiddenTransform,
        transition: `opacity 0.7s ease ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
