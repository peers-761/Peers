"use client";

// "Learning, lit one page at a time" — a pinned scroll scene.
// As the visitor scrolls, a closed PEERS book opens, its pages fill with
// writing, a candle rises on the spine and is lit, and a page turns.
// All motion is driven by ONE number (--p, 0 to 1) written on the section;
// the CSS turns it into rotations, fades and glow. Smoothed with a little
// easing so it feels silky on every device. Reduced-motion visitors simply
// see the finished scene.

import { useEffect, useRef } from "react";
import "./BookCandle.css";

// Deterministic "random" so the server and the browser draw the same specks.
function specks(n) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const size = 2 + rnd() * 2.6;
    return {
      left: Math.round(rnd() * 90 - 45),
      top: Math.round(52 + rnd() * 40),
      size: +size.toFixed(1),
      d: +(6 + rnd() * 6).toFixed(1),
      dl: +(rnd() * 10).toFixed(1),
      dx: Math.round(rnd() * 90 - 45),
    };
  });
}
const SPECKS = specks(22);

const Ln = ({ i, h, children }) => (
  <span className={`ln${h ? " h" : ""}`} style={{ "--i": i }}>{children}</span>
);

export default function BookCandle({ foundingYear = 2010 }) {
  const track = useRef(null);
  const fit = useRef(null);
  const title = useRef(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;

    const resize = () => {
      const f = fit.current;
      if (!f) return;
      const th = title.current?.offsetHeight || 120;
      const sc = Math.max(0.5, Math.min(1, (window.innerWidth - 6) / 540, (window.innerHeight - 70 - th - 30) / 430));
      f.style.setProperty("--sc", sc.toFixed(3));
      f.style.marginBottom = `${-(1 - sc) * 430}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "1");
      return () => window.removeEventListener("resize", resize);
    }

    let cur = 0;
    let raf = 0;
    let active = false;
    const frame = () => {
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const target = Math.min(1, Math.max(0, -r.top / total));
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      el.style.setProperty("--p", cur.toFixed(4));
      if (active) raf = requestAnimationFrame(frame);
    };
    // Only animate while the section is on (or near) the screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (active) raf = requestAnimationFrame(frame);
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section ref={track} className="bc-track" style={{ "--p": 0 }} aria-label="The PEERS story">
      <div className="bc-stage">
        <div ref={title} className="bc-title">
          <h2>Learning, lit one page at a time</h2>
          <p>
            Since {foundingYear}, PEERS has taught the children of Shadbagh, Lahore with good teachers,
            steady discipline and an open door for every parent.
          </p>
        </div>

        <div ref={fit} className="bc-fit" aria-hidden="true">
          <div className="bc-glow" />
          <div className="bc-shadow" />

          <div className="bc-persp">
            <div className="bk">
              <div className="bk-base l" />
              <div className="bk-base r" />

              {/* Right page, revealed once the turning page has gone */}
              <div className="pg r">
                <div className="pgtxt" style={{ "--w": "var(--w2)" }}>
                  <Ln i={0} h>Parents in touch</Ln>
                  <Ln i={1}>Attendance, fee vouchers,</Ln>
                  <Ln i={2}>results and notices reach</Ln>
                  <Ln i={3}>parents on their phone,</Ln>
                  <Ln i={4}>so nothing at school is</Ln>
                  <Ln i={5}>ever a surprise at home.</Ln>
                </div>
              </div>

              {/* The page that turns */}
              <div className="leaf turn">
                <div className="face paper f">
                  <div className="pgtxt" style={{ "--w": "var(--w1)" }}>
                    <Ln i={0} h>Two chapters</Ln>
                    <Ln i={1}>School: 8 AM to 2 PM.</Ln>
                    <Ln i={2}>Primal Academy: 3 PM</Ln>
                    <Ln i={3}>to 8 PM, on the same</Ln>
                    <Ln i={4}>Amir Road campus.</Ln>
                  </div>
                </div>
                <div className="face paper b back">
                  <div className="pgtxt" style={{ "--w": "var(--w2)" }}>
                    <Ln i={0} h>Our promise</Ln>
                    <Ln i={1}>A Master&apos;s-qualified</Ln>
                    <Ln i={2}>teacher in every subject,</Ln>
                    <Ln i={3}>science labs, cool rooms</Ln>
                    <Ln i={4}>and Topper Test Sessions</Ln>
                    <Ln i={5}>for board-ready children.</Ln>
                  </div>
                </div>
              </div>

              {/* The cover that opens */}
              <div className="leaf cover">
                <div className="face leather">
                  <div className="cv-frame" />
                  <div className="cv-inner">
                    <div className="cv-orn" />
                    <div className="t1 foil">PEERS</div>
                    <div className="t2 foil">The Education System</div>
                    <div className="t3">We take you along</div>
                  </div>
                </div>
                <div className="face paper b back">
                  <div className="pgtxt" style={{ "--w": "var(--w1)" }}>
                    <Ln i={0} h>Our story</Ln>
                    <Ln i={1}>Founded in {foundingYear} in</Ln>
                    <Ln i={2}>Shadbagh, Lahore, from</Ln>
                    <Ln i={3}>one simple idea: teach</Ln>
                    <Ln i={4}>well and take every</Ln>
                    <Ln i={5}>child along.</Ln>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specks of light rising from the flame */}
          <div className="dust">
            {SPECKS.map((s, i) => (
              <i key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, "--d": `${s.d}s`, "--dl": `-${s.dl}s`, "--dx": `${s.dx}px` }} />
            ))}
          </div>

          {/* The candle on the spine */}
          <div className="candle">
            <div className="c-flamewrap">
              <div className="c-flame">
                <svg viewBox="0 0 34 64">
                  <defs>
                    <linearGradient id="bcFo" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0" stopColor="#ff7a00" />
                      <stop offset=".55" stopColor="#ffb52e" />
                      <stop offset="1" stopColor="#ffd978" stopOpacity=".9" />
                    </linearGradient>
                    <linearGradient id="bcFi" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0" stopColor="#fff6c8" />
                      <stop offset="1" stopColor="#ffe27a" />
                    </linearGradient>
                  </defs>
                  <path d="M17 0C20 15 33 25 33 43C33 55 26 64 17 64C8 64 1 55 1 43C1 25 14 15 17 0Z" fill="url(#bcFo)" />
                  <path d="M17 24C19 33 25 37 25 47C25 55 21.5 60 17 60C12.5 60 9 55 9 47C9 37 15 33 17 24Z" fill="url(#bcFi)" />
                  <ellipse cx="17" cy="52" rx="4" ry="6" fill="#fff" opacity=".9" />
                </svg>
              </div>
            </div>
            <div className="c-wick" />
            <div className="c-wax">
              <i className="c-drip" style={{ left: 5, height: 22 }} />
              <i className="c-drip" style={{ left: 24, height: 14 }} />
            </div>
            <div className="c-dish" />
          </div>
        </div>

        <div className="bc-hint">
          Scroll to open the book<span />
        </div>
      </div>
    </section>
  );
}
