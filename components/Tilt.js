"use client";

import { useEffect, useRef } from "react";
import { canHover, isLite } from "../lib/perf";

// Gives a card a gentle 3D tilt toward the mouse with a soft light sheen.
// Only runs on devices with a mouse / trackpad that are not "lite"; on
// phones the card is simply a card. Only transform and opacity are touched.
export default function Tilt({ className = "", max = 7, lift = 6, children }) {
  const ref = useRef(null);
  const sheen = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover() || isLite()) return;
    let raf = 0;
    let rx = 0, ry = 0, px = 0.5, py = 0.5;

    const draw = () => {
      raf = 0;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(0,${-lift}px,0)`;
      if (sheen.current) sheen.current.style.transform = `translate3d(${((px - 0.5) * 70).toFixed(1)}%, ${((py - 0.5) * 70).toFixed(1)}%, 0)`;
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      ry = (px - 0.5) * 2 * max;
      rx = -(py - 0.5) * 2 * max;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onEnter = () => {
      el.style.willChange = "transform";
      el.style.transition = "transform .12s ease-out";
      if (sheen.current) sheen.current.style.opacity = "1";
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.transition = "transform .6s cubic-bezier(.16,1,.3,1)";
      el.style.transform = "";
      if (sheen.current) sheen.current.style.opacity = "0";
      setTimeout(() => { el.style.willChange = ""; }, 650);
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [max, lift]);

  return (
    <div ref={ref} className={className}>
      {children}
      <div className="tilt-clip" aria-hidden="true">
        <span ref={sheen} className="tilt-sheen" />
      </div>
    </div>
  );
}
