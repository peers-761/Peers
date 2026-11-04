import Icon from "./Icon";

// A section heading with an icon badge, a sparkle ornament and a gradient title.
//   <SectionTitle icon="users" title="..." sub="..." />            (left aligned)
//   <SectionTitle icon="bell" title="..." align="center" light />  (on a dark background)
export default function SectionTitle({ icon, title, sub, align = "left", light = false, as: Tag = "h2" }) {
  return (
    <div className={`st st-${align}${light ? " st-light" : ""}`}>
      <div className="st-badge" aria-hidden="true">
        <Icon name={icon} size={22} />
      </div>
      <div className="st-orn" aria-hidden="true">
        <span />
        <Icon name="sparkle" size={14} stroke={1.6} />
        <span />
      </div>
      <Tag className="st-title">{title}</Tag>
      {sub ? <p className="st-sub">{sub}</p> : null}
    </div>
  );
}
