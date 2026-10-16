import Header from "../components/Header";
import Footer from "../components/Footer";
import NoticesList from "../components/NoticesList";
import ScrollReveal from "../components/ScrollReveal";
import { COLORS } from "../lib/theme";
import { readDB } from "../lib/data";
import { FAQS } from "../lib/faqData";
import { SITE_ADDRESS, FOUNDING_YEAR } from "../lib/seo";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const db = await readDB();
  const notices = db.notices.slice(0, 3);

  return (
    <div>
      <Header />

      {/* Hero */}
      <section style={{ background: COLORS.navy, padding: "64px 24px 72px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 480px", minWidth: 300 }}>
            <p className="fade-up-in" style={{ animationDelay: "0s", fontSize: 13, color: COLORS.gold, fontWeight: 600, letterSpacing: 0.4, margin: "0 0 14px" }}>
              WE TAKE YOU ALONG
            </p>
            <h1
              className="hero-h1 fade-up-in"
              style={{
                animationDelay: "0.1s",
                fontFamily: "'Lora', serif",
                fontWeight: 600,
                lineHeight: 1.25,
                color: "#fff",
                margin: "0 0 20px",
                maxWidth: 520,
              }}
            >
              The PEERS Education System: a school in Shadbagh, Lahore for PG to 10th
            </h1>
            <p className="fade-up-in" style={{ animationDelay: "0.2s", fontSize: 15.5, color: "#C6CBE0", lineHeight: 1.75, margin: "0 0 32px", maxWidth: 520 }}>
              One campus, two chapters of learning every day. The PEERS Education System runs school hours
              each morning and Primal Academy each evening on Amir Road, under two dedicated leaders, with
              strong academics, science labs, sports and a Parent Portal for every family.
            </p>
            <div className="fade-up-in" style={{ animationDelay: "0.3s", display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a
                href="/admissions"
                className="cta-btn"
                style={{ background: COLORS.red, color: "#fff", padding: "13px 26px", borderRadius: 5, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
              >
                Apply for admission
              </a>
              <a
                href="/academics"
                className="cta-btn"
                style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "13px 26px", borderRadius: 5, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
              >
                See our programs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: "0 0 8px" }}>
          Led by two people, one mission
        </h2>
        <p style={{ color: COLORS.muted, fontSize: 14.5, margin: "0 0 36px", maxWidth: 560 }}>
          The morning school and the evening academy share a campus and answer to two leaders who built
          each half of the day.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
          <ScrollReveal delay={0} direction="left">
            <div style={{ borderLeft: `3px solid ${COLORS.navy}`, paddingLeft: 20 }}>
              <p style={{ fontSize: 11.5, color: COLORS.navy, fontWeight: 600, letterSpacing: 0.3, margin: "0 0 6px" }}>
                MORNING · THE PEERS EDUCATION SYSTEM
              </p>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 19, margin: "0 0 4px", color: COLORS.ink }}>Sir Rana Iftikhar Sadiq</h3>
              <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15} direction="right">
            <div style={{ borderLeft: `3px solid ${COLORS.gold}`, paddingLeft: 20 }}>
              <p style={{ fontSize: 11.5, color: "#8A5B00", fontWeight: 600, letterSpacing: 0.3, margin: "0 0 6px" }}>
                EVENING · PRIMAL ACADEMY
              </p>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 19, margin: "0 0 4px", color: COLORS.ink }}>Sir Zeeshan</h3>
              <p style={{ fontSize: 13.5, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Legacy / achievements — what PEERS has stood for since 2010 */}
      <section style={{ background: COLORS.navy, padding: "56px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 36, alignItems: "center" }}>
          <ScrollReveal delay={0} direction="left">
            <div>
              <p style={{ fontSize: 13, color: COLORS.gold, fontWeight: 600, letterSpacing: 0.4, margin: "0 0 12px" }}>
                SINCE {FOUNDING_YEAR}
              </p>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: "#fff", margin: "0 0 14px" }}>
                A decade and more of producing board toppers
              </h2>
              <p style={{ fontSize: 14.5, color: "#C6CBE0", lineHeight: 1.85, margin: 0, maxWidth: 560 }}>
                Since {FOUNDING_YEAR}, The PEERS Education System has built a reputation in Shadbagh, Lahore as a
                top-notch quality education and premium-environment school — producing board (Matric) toppers year
                after year through dedicated Topper Test Sessions, Master's-qualified subject teachers in every
                class, and a disciplined, air-conditioned learning environment.
              </p>
            </div>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {[
              ["Est. " + FOUNDING_YEAR, "Serving Shadbagh, Lahore"],
              ["Board Toppers", "Produced year after year"],
              ["Master's-Qualified", "Teacher for every subject"],
              ["AC Classrooms", "Premium learning environment"],
            ].map(([big, small], i) => (
              <ScrollReveal key={big} delay={0.1 + i * 0.1} direction="scale">
                <div className="photo-card" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "16px 14px" }}>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: 17, fontWeight: 600, color: COLORS.gold, margin: "0 0 4px" }}>{big}</p>
                  <p style={{ fontSize: 12, color: "#C6CBE0", margin: 0 }}>{small}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why families choose PEERS */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "64px 24px 24px" }}>
        <ScrollReveal>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: "0 0 8px" }}>
            Why families in Shadbagh, Lahore choose PEERS
          </h2>
          <p style={{ color: COLORS.muted, fontSize: 14.5, margin: "0 0 32px", maxWidth: 640 }}>
            A school is more than a timetable. Here is what a PEERS child and parent can count on, from PG to 10th class.
          </p>
        </ScrollReveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22 }}>
          {[
            ["Academics with practical learning", "Strong classroom teaching from PG to 10th, paired with hands-on work so children understand ideas, not just memorise them."],
            ["Science labs and sports ground", "Experiments in our science labs and training on a real sports ground under qualified coaches."],
            ["Morning school and evening academy", "The PEERS Education System runs 8:00 AM to 2:00 PM, and Primal Academy runs 3:00 PM to 8:00 PM, on the same campus."],
            ["A Parent Portal for every family", "See attendance, monthly fee vouchers, test results and notices, and get notifications on your phone."],
            ["Clear monthly fee vouchers", "Download the voucher as a PDF, upload your payment receipt, and see every receipt you have submitted with its date and time."],
            ["Online tests for Classes 9 and 10", "Unit, quarter, half-book and full-book tests can run online, so learning does not stop when the school is closed."],
            ["Air-conditioned classrooms", "Every classroom is air-conditioned, so learning stays comfortable and focused in every season."],
            ["Master's-qualified subject teachers", "In every class, every subject is taught by a teacher who holds a Master's degree in that very subject."],
            ["Co-curricular activities for board students", "Students preparing for board exams also take part in co-curricular activities that build confidence alongside academics."],
            ["Topper Test Sessions", "Dedicated Topper Test Sessions sharpen exam technique and push high-performing students further."],
          ].map(([title, text], i) => (
            <ScrollReveal key={title} delay={(i % 3) * 0.1}>
              <div
                className="feature-card"
                style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "20px 22px", background: "#fff", transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease" }}
              >
                <h3 style={{ fontFamily: "'Lora', serif", fontSize: 17, color: COLORS.navy, margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7, margin: 0 }}>{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Sports, practicals, and quality education */}
      <section style={{ background: COLORS.tint, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <ScrollReveal>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: "0 0 8px" }}>
              Sports, practicals, and quality education
            </h2>
            <p style={{ color: COLORS.muted, fontSize: 14.5, margin: "0 0 32px", maxWidth: 620 }}>
              A look at what learning looks like day-to-day at PEERS.
            </p>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 36 }}>
            <ScrollReveal delay={0}>
              <img className="photo-card" src="/sports.jpg" alt="Students playing cricket with their coach" style={{ width: "100%", height: 240, objectFit: "cover", display: "block", borderRadius: 8 }} />
            </ScrollReveal>
            <ScrollReveal delay={0.12}>
              <img className="photo-card" src="/physics-class.jpg" alt="Physics class in session" style={{ width: "100%", height: 240, objectFit: "cover", display: "block", borderRadius: 8 }} />
            </ScrollReveal>
            <ScrollReveal delay={0.24}>
              <img className="photo-card" src="/chemistry-lab.jpg" alt="Students doing a chemistry experiment" style={{ width: "100%", height: 240, objectFit: "cover", display: "block", borderRadius: 8 }} />
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <div style={{ maxWidth: 760 }}>
              <p style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.85, margin: "0 0 18px" }}>
                At PEERS, a strong report card is only half the story. Our students train on a real sports
                ground under qualified coaches, run experiments in fully equipped science labs, and sit in
                classrooms built for focus — because we believe confidence, curiosity, and discipline are
                taught just as deliberately as the syllabus.
              </p>
              <p style={{ fontSize: 15, color: COLORS.ink, lineHeight: 1.85, margin: 0 }}>
                Every subject is taught with the same intent: give a child the tools to understand the
                world, not just pass an exam in it. That's the standard we hold every class to, from PG
                through 10th.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Notices preview */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "64px 24px" }}>
        <ScrollReveal>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: 0 }}>
              Latest updates
            </h2>
            <a href="/notices" style={{ fontSize: 13, color: COLORS.red, textDecoration: "none" }}>
              View all
            </a>
          </div>
          <NoticesList notices={notices} />
        </ScrollReveal>
      </section>

      {/* Find us */}
      <section style={{ background: COLORS.tint, padding: "56px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 36 }}>
          <ScrollReveal direction="left">
            <div>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: "0 0 12px" }}>
                Find us in Shadbagh, Lahore
              </h2>
              <address style={{ fontStyle: "normal", fontSize: 14.5, color: COLORS.ink, lineHeight: 1.8, margin: "0 0 14px" }}>
                <strong>The PEERS Education System</strong><br />
                {SITE_ADDRESS.streetAddress}, {SITE_ADDRESS.addressLocality}, Pakistan
              </address>
              <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.75, margin: "0 0 18px" }}>
                Morning school: 8:00 AM to 2:00 PM. Primal Academy (evening): 3:00 PM to 8:00 PM. To ask about
                admissions for PG to 10th class, use the inquiry form or contact the school office.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="/admissions" className="cta-btn" style={{ background: COLORS.red, color: "#fff", padding: "11px 22px", borderRadius: 5, fontSize: 13.5, fontWeight: 500, textDecoration: "none" }}>Admissions</a>
                <a href="/contact" className="cta-btn" style={{ border: `1px solid ${COLORS.navy}`, color: COLORS.navy, padding: "11px 22px", borderRadius: 5, fontSize: 13.5, fontWeight: 500, textDecoration: "none" }}>Contact us</a>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" delay={0.1}>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "24px 26px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: COLORS.navy, margin: "0 0 16px" }}>Quick facts</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Established", `${FOUNDING_YEAR}, in Shadbagh, Lahore`],
                  ["Classes offered", "PG to 10th (Matric)"],
                  ["School hours", "8:00 AM – 2:00 PM"],
                  ["Evening academy", "Primal Academy, 3:00 PM – 8:00 PM"],
                  ["Facilities", "Air-conditioned classrooms, science labs, sports ground"],
                  ["For parents", "Fee vouchers, attendance and results on the Parent Portal"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 10 }}>
                    <span style={{ fontSize: 13, color: COLORS.muted }}>{label}</span>
                    <span style={{ fontSize: 13.5, color: COLORS.ink, fontWeight: 500, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ teaser */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 25, color: COLORS.navy, margin: "0 0 24px" }}>
          Questions parents ask
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {FAQS.slice(0, 4).map((f, i) => (
            <ScrollReveal key={f.q} delay={i * 0.08}>
              <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16 }}>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, color: COLORS.ink, margin: "0 0 6px" }}>{f.q}</h3>
                <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.75, margin: 0 }}>{f.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p style={{ margin: "20px 0 0", fontSize: 14 }}>
          <a href="/faqs" style={{ color: COLORS.red, textDecoration: "none", fontWeight: 500 }}>See all questions and answers →</a>
        </p>
      </section>

      {/* Admissions CTA */}
      <section style={{ background: COLORS.navy, padding: "52px 24px" }}>
        <ScrollReveal>
          <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 21, color: "#fff", margin: "0 0 6px" }}>
                Ready to join The PEERS Education System?
              </h2>
              <p style={{ fontSize: 13.5, color: "#C6CBE0", margin: 0 }}>Admissions for the new session are open now.</p>
            </div>
            <a
              href="/admissions"
              className="cta-btn"
              style={{ background: COLORS.red, color: "#fff", padding: "13px 28px", borderRadius: 5, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
            >
              Start application
            </a>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
