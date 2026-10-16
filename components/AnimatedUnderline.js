"use client";

// A hand-drawn-style underline beneath a heading/tagline that continuously
// draws itself in, then erases, then repeats.
export default function AnimatedUnderline({ color = "#C8102E", width = 180 }) {
  return (
    <svg width={width} height="14" viewBox={`0 0 ${width} 14`} style={{ display: "block", marginTop: 4 }}>
      <path
        d={`M4 8 Q ${width / 2} 2, ${width - 4} 8`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="100"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: 100,
          animation: "draw-underline 2.6s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes draw-underline {
          0% { stroke-dashoffset: 100; }
          40% { stroke-dashoffset: 0; }
          70% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
      `}</style>
    </svg>
  );
}
