// A small set of clean line icons (no libraries needed). Usage:
//   <Icon name="trophy" size={22} />   — colour follows the text colour.
const P = {
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /><path d="M9 7.5h6" /></>,
  flask: <><path d="M9 3h6" /><path d="M10 3v6.2L4.6 18.4A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3.1L14 9.2V3" /><path d="M7.5 15h9" /></>,
  atom: <><circle cx="12" cy="12" r="1.7" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></>,
  trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4a3 3 0 0 0 3 5" /><path d="M17 6h3a3 3 0 0 1-3 5" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6c3.4 3 3.4 10 0 12.8" /><path d="M18.4 5.6c-3.4 3-3.4 10 0 12.8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></>,
  moon: <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></>,
  snow: <><path d="M12 2v20" /><path d="M4.2 7l15.6 10" /><path d="M4.2 17L19.8 7" /><path d="M9.2 3.6L12 6l2.8-2.4" /><path d="M9.2 20.4L12 18l2.8 2.4" /></>,
  cap: <><path d="M2 9l10-5 10 5-10 5L2 9z" /><path d="M6 11.3V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.7" /><path d="M22 9v6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.2c3 .2 5 2 5 5" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" /><path d="M8.8 12l2.2 2.2 4.2-4.4" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18.5h2" /></>,
  call: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></>,
  receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" /><path d="M9 7h6M9 11h6M9 15h3" /></>,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 20h20" /></>,
  star: <><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>,
  pin: <><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
  bell: <><path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4l2-2z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  sparkle: <><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></>,
  pencil: <><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z" /><path d="M14 7l3 3" /></>,
  building: <><path d="M4 21V6l8-3 8 3v15" /><path d="M2 21h20" /><path d="M9 9h2M13 9h2M9 13h2M13 13h2" /><path d="M10 21v-4h4v4" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12.5l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1 1-1.1 1.8" /><path d="M12 17h.01" /></>,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  quote: <><path d="M7 6h4v5c0 3.2-1.6 5.4-4.2 6.4l-.9-1.7c1.5-.7 2.1-1.8 2.1-3.2H5V6h2z M15 6h4v5c0 3.2-1.6 5.4-4.2 6.4l-.9-1.7c1.5-.7 2.1-1.8 2.1-3.2H13V6h2z" fill="currentColor" stroke="none" /></>,
  heart: <><path d="M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2c0 6-8.5 11.5-8.5 11.5z" /></>,
};

export default function Icon({ name, size = 22, stroke = 1.8, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {P[name] || null}
    </svg>
  );
}
