import Icon from "./Icon";

// A slowly scrolling ribbon of short facts separated by sparkles.
// Pure CSS (no JavaScript); stops moving for visitors who prefer less motion.
export default function Marquee({ items }) {
  const row = (key) => (
    <ul className="mq-row" key={key} aria-hidden={key === "b"}>
      {items.map((t) => (
        <li key={t}>
          <Icon name="sparkle" size={16} stroke={1.7} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mq" role="region" aria-label="PEERS at a glance">
      <div className="mq-track">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
