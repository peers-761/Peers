"use client";

import { useEffect, useRef, useState } from "react";

// Fades and slides its children in from the given direction once they
// scroll into view. Wrap any section/image with this for a subtle
// "reveal on scroll" effect.
export default function SlideIn({ children, direction = "up", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const offset = {
    up: "translateY(28px)",
    left: "translateX(-28px)",
    right: "translateX(28px)",
  }[direction];

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0,0)" : offset,
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
