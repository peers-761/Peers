"use client";

import { useEffect, useRef } from "react";
import { isLite } from "../lib/perf";

// A photo that swings in from the LEFT or RIGHT edge of the screen like a
// door on a hinge (while its words slide in from the other side) the first
// time it is scrolled into view; afterwards the picture drifts very slightly
// against its frame as you scroll, which gives a feeling of depth.
// Without JavaScript, or with "reduce motion" on, it is simply shown in place.
export default function PhotoChapter({ src, alt, title, side = "left", children }) {
  const ref = useRef(null);
  const par = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.85;
    if (!reduce && !alreadyVisible) {
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
    }

    // Depth: the picture moves a few pixels the other way while scrolling.
    if (reduce || isLite() || !par.current) return;
    const layer = par.current;
    let raf = 0;
    let visible = false;
    const draw = () => {
      raf = 0;
      const r = layer.parentElement.getBoundingClientRect();
      const t = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight; // about -1 .. 1
      layer.style.transform = `translate3d(0, ${(t * -26).toFixed(1)}px, 0) scale(1.14)`;
    };
    const onScroll = () => { if (visible && !raf) raf = requestAnimationFrame(draw); };
    const vis = new IntersectionObserver(([e]) => { visible = e.isIntersecting; onScroll(); }, { rootMargin: "100px" });
    vis.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      vis.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`pc pc-${side}`}>
      <figure className="pc-fig">
        <div className="pc-frame">
          <div ref={par} className="pc-par">
            <img src={src} alt={alt} loading="lazy" />
          </div>
        </div>
      </figure>
      <div className="pc-copy">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
