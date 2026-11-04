"use client";

import { useEffect, useRef } from "react";
import { canHover, isLite } from "../lib/perf";

// The two hero photos float at different "depths": as the mouse moves, the
// nearer photo moves more than the farther one and the whole group tilts a
// little, like a real 3D stack. Transform only; off on phones / modest devices.
export default function HeroCollage({ photos }) {
  const stage = useRef(null);
  const layers = useRef([]);

  useEffect(() => {
    const host = stage.current?.parentElement?.parentElement; // the hero section
    if (!host || !canHover() || isLite()) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const draw = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      stage.current.style.transform = `rotateX(${(-cy * 5).toFixed(2)}deg) rotateY(${(cx * 7).toFixed(2)}deg)`;
      layers.current.forEach((l, i) => {
        if (!l) return;
        const d = (i + 1) * 16;
        l.style.transform = `translate3d(${(cx * d).toFixed(1)}px, ${(cy * d).toFixed(1)}px, 0)`;
      });
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(draw) : 0;
    };
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(draw); };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero-collage" aria-hidden="true">
      <div ref={stage} className="hc-stage">
        {photos.map((src, i) => (
          <div key={src} ref={(n) => (layers.current[i] = n)} className="hc-layer">
            <figure className={`hero-photo p${i + 1}`}>
              <img src={src} alt="" />
            </figure>
          </div>
        ))}
      </div>
    </div>
  );
}
