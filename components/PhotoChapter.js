"use client";

import { useEffect, useRef } from "react";

// A photo that slides in from the LEFT or RIGHT edge of the screen (while
// its text slides in from the opposite side) the first time it is scrolled
// into view. Without JavaScript, or with "reduce motion" switched on, it is
// simply shown in place.
export default function PhotoChapter({ src, alt, title, side = "left", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.85;
    if (reduce || alreadyVisible) return; // leave it visible, no animation
    el.classList.add("pc-armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`pc pc-${side}`}>
      <figure className="pc-fig">
        <div className="pc-frame">
          <img src={src} alt={alt} loading="lazy" />
        </div>
      </figure>
      <div className="pc-copy">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
