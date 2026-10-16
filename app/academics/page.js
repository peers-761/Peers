import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS, CLASSES } from "../../lib/theme";

export const metadata = {
  title: "Academics — Classes PG to 10th in Lahore",
  description:
    "Classes PG through 10th at The PEERS Education System, Shadbagh, Lahore: strong academics with practical learning, science labs and sports.",
  alternates: { canonical: "/academics" },
};

export default function AcademicsPage() {
  return (
    <div>
      <Header />
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>ACADEMICS</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 24px" }}>
          Classes we teach
        </h1>
        <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 40px" }}>
          We teach from PG through 10th class, with a curriculum that pairs strong academics with
          practical, hands-on learning and sports. For fee details, enrolled parents can check their
          child's own fee on the Parent Portal, or contact the school office directly.
        </p>

        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          {CLASSES.map((c, i) => (
            <div
              key={c}
              style={{
                padding: "12px 20px",
                borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ fontSize: 14, color: COLORS.ink }}>{/^\d+$/.test(c) ? `Class ${c}` : c}</span>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
