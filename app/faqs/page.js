import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS } from "../../lib/theme";
import { FAQS } from "../../lib/faqData";

export const metadata = {
  title: "FAQs — Admissions, Fees, Timings and Parent Portal",
  description:
    "Answers to common questions about The PEERS Education System in Shadbagh, Lahore: classes PG to 10th, timings, admissions, fees, sports, science labs, the Parent Portal and online tests.",
  alternates: { canonical: "/faqs" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqsPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>FAQS</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 12px" }}>
          Frequently asked questions
        </h1>
        <p style={{ fontSize: 14.5, color: COLORS.muted, lineHeight: 1.75, margin: "0 0 32px" }}>
          Everything parents ask us most about The PEERS Education System in Shadbagh, Lahore — classes, timings,
          admissions, fees, sports, science labs, the Parent Portal and online tests. Can't find your answer?{" "}
          <a href="/contact" style={{ color: COLORS.red }}>Contact the school office</a>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 20 }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 600, color: COLORS.ink, margin: "0 0 8px" }}>{f.q}</h2>
              <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.75, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/admissions" style={{ background: COLORS.red, color: "#fff", padding: "12px 24px", borderRadius: 5, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            Apply for admission
          </a>
          <a href="/contact" style={{ border: `1px solid ${COLORS.navy}`, color: COLORS.navy, padding: "12px 24px", borderRadius: 5, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            Contact us
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
