import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS } from "../../lib/theme";

export const metadata = {
  title: "About Us — School in Shadbagh, Lahore",
  description:
    "About The PEERS Education System (Primal Early Education Reforms School): our story, our morning school and evening academy, and our approach to academics, practical learning and sports in Shadbagh, Lahore.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div>
      <Header />
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>ABOUT US</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 24px" }}>
          The PEERS Education System
        </h1>
        <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 20px" }}>
          The PEERS Education System — Primal Early Education Reforms School — was built on one idea: a
          child's day should not be split between "school" and "everything else." Our campus runs school
          hours each morning and Primal Academy each evening, so students have one place, one standard,
          and one community for their whole day.
        </p>
        <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 40px" }}>
          Our tagline, "We take you along," reflects how we work with families: every parent should be
          able to see their child's attendance, fees, and progress without having to ask.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28, marginBottom: 48 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, letterSpacing: 0.3, margin: "0 0 8px" }}>OUR VISION</p>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.8, margin: 0 }}>
              To be recognised among the best education institutes in Pakistan by shaping students who
              are strong in the classroom, capable with their hands, and confident on the sports field.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, letterSpacing: 0.3, margin: "0 0 8px" }}>OUR MISSION</p>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.8, margin: 0 }}>
              To deliver quality education that goes beyond theory — pairing academics with practical,
              hands-on learning and sports — so every student from PG to 10th grows in knowledge and
              character alike.
            </p>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, letterSpacing: 0.3, margin: "0 0 8px" }}>OUR PROMISE</p>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.8, margin: 0 }}>
              "We take you along" — every parent stays informed at every step, with clear visibility
              into attendance, fees, and progress, from morning school through evening academy.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
          <div style={{ borderLeft: `3px solid ${COLORS.navy}`, paddingLeft: 20 }}>
            <p style={{ fontSize: 11.5, color: COLORS.navy, fontWeight: 600, letterSpacing: 0.3, margin: "0 0 6px" }}>
              MORNING · THE PEERS EDUCATION SYSTEM
            </p>
            <h3 style={{ fontFamily: "'Lora', serif", fontSize: 19, margin: "0 0 4px", color: COLORS.ink }}>Sir Rana Iftikhar Sadiq</h3>
            <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
          </div>
          <div style={{ borderLeft: `3px solid ${COLORS.gold}`, paddingLeft: 20 }}>
            <p style={{ fontSize: 11.5, color: "#8A5B00", fontWeight: 600, letterSpacing: 0.3, margin: "0 0 6px" }}>
              EVENING · PRIMAL ACADEMY
            </p>
            <h3 style={{ fontFamily: "'Lora', serif", fontSize: 19, margin: "0 0 4px", color: COLORS.ink }}>Sir Zeeshan</h3>
            <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
