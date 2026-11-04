import Header from "../components/Header";
import Footer from "../components/Footer";
import NoticesList from "../components/NoticesList";
import ScrollReveal from "../components/ScrollReveal";
import BookCandle from "../components/BookCandle";
import PhotoChapter from "../components/PhotoChapter";
import Counter from "../components/Counter";
import Icon from "../components/Icon";
import SectionTitle from "../components/SectionTitle";
import Marquee from "../components/Marquee";
import Tilt from "../components/Tilt";
import HeroCollage from "../components/HeroCollage";
import { COLORS } from "../lib/theme";
import { readDB } from "../lib/data";
import { FAQS } from "../lib/faqData";
import { SITE_ADDRESS, FOUNDING_YEAR } from "../lib/seo";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const db = await readDB();
  const notices = db.notices.slice(0, 3);
  const years = new Date().getFullYear() - FOUNDING_YEAR;

  const features = [
    ["book", "Academics with practical learning", "Strong classroom teaching from PG to 10th, paired with hands-on work so children understand ideas, not just memorise them."],
    ["flask", "Science labs and sports ground", "Experiments in our science labs and training on a real sports ground under qualified coaches."],
    ["sun", "Morning school and evening academy", "The PEERS Education System runs 8:00 AM to 2:00 PM, and Primal Academy runs 3:00 PM to 8:00 PM, on the same campus."],
    ["phone", "A Parent Portal for every family", "See attendance, monthly fee vouchers, test results and notices, and get notifications on your phone."],
    ["receipt", "Clear monthly fee vouchers", "Download the voucher as a PDF, upload your payment receipt, and see every receipt you have submitted with its date and time."],
    ["laptop", "Online tests for Classes 9 and 10", "Unit, quarter, half-book and full-book tests can run online, so learning does not stop when the school is closed."],
    ["snow", "Air-conditioned classrooms", "Every classroom is air-conditioned, so learning stays comfortable and focused in every season."],
    ["cap", "Master's-qualified subject teachers", "In every class, every subject is taught by a teacher who holds a Master's degree in that very subject."],
    ["target", "Co-curricular activities for board students", "Students preparing for board exams also take part in co-curricular activities that build confidence alongside academics."],
    ["trophy", "Topper Test Sessions", "Dedicated Topper Test Sessions sharpen exam technique and push high-performing students further."],
  ];

  return (
    <div>
      <Header />

      {/* Hero */}
      <section className="hero-wrap" style={{ background: COLORS.navy, padding: "64px 24px 76px" }}>
        <div className="hero-orb a" aria-hidden="true" />
        <div className="hero-orb b" aria-hidden="true" />
        <div style={{ position: "relative", maxWidth: 1140, margin: "0 auto", display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 480px", minWidth: 300 }}>
            <p className="fade-up-in" style={{ animationDelay: "0s", fontSize: 13, color: COLORS.gold, fontWeight: 600, letterSpacing: 0.4, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sparkle" size={16} /> WE TAKE YOU ALONG
            </p>
            <h1
              className="hero-h1 fade-up-in"
              style={{ animationDelay: "0.1s", fontFamily: "'Lora', serif", fontWeight: 600, lineHeight: 1.25, color: "#fff", margin: "0 0 22px", maxWidth: 540 }}
            >
              The PEERS Education System: a school in{" "}
              <span className="hl">
                Shadbagh, Lahore
                <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M3 9 C 40 2, 90 12, 130 6 S 190 5, 197 8" /></svg>
              </span>{" "}
              for PG to 10th
            </h1>
            <p className="fade-up-in" style={{ animationDelay: "0.2s", fontSize: 15.5, color: "#C6CBE0", lineHeight: 1.75, margin: "0 0 30px", maxWidth: 520 }}>
              One campus, two chapters of learning every day. The PEERS Education System runs school hours
              each morning and Primal Academy each evening on Amir Road, under two dedicated leaders, with
              strong academics, science labs, sports and a Parent Portal for every family.
            </p>
            <div className="fade-up-in" style={{ animationDelay: "0.3s", display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="/admissions" className="cta-btn" style={{ background: COLORS.red, color: "#fff", padding: "13px 26px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                Apply for admission <Icon name="arrow" size={16} />
              </a>
              <a href="/academics" className="cta-btn" style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "13px 26px", borderRadius: 6, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
                See our programs
              </a>
            </div>
            <ul className="hero-chips fade-up-in" style={{ animationDelay: "0.45s" }}>
              <li><Icon name="calendar" size={16} /> Since {FOUNDING_YEAR}</li>
              <li><Icon name="cap" size={16} /> PG to 10th</li>
              <li><Icon name="snow" size={16} /> Air-conditioned</li>
              <li><Icon name="phone" size={16} /> Parent Portal</li>
            </ul>
          </div>

          <HeroCollage photos={["/physics-class.jpg", "/chemistry-lab.jpg"]} />
        </div>
      </section>

      {/* The story: a book opens and a candle is lit as you scroll */}
      <BookCandle foundingYear={FOUNDING_YEAR} />

      {/* At a glance ribbon */}
      <Marquee
        items={[
          `Since ${FOUNDING_YEAR}`,
          "PG to 10th class",
          "Master's-qualified subject teachers",
          "Air-conditioned classrooms",
          "Science labs",
          "Sports ground",
          "Topper Test Sessions",
          "Parent Portal",
          "Morning school and evening academy",
        ]}
      />

      {/* Leadership */}
      <section className="cv-auto" style={{ maxWidth: 1140, margin: "0 auto", padding: "72px 24px 64px" }}>
        <SectionTitle
          icon="users"
          title="Led by two people, one mission"
          sub="The morning school and the evening academy share a campus and answer to two leaders who built each half of the day."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 26 }}>
          <ScrollReveal delay={0} direction="left" style={{ height: "100%" }}>
            <div className="lead-card" style={{ "--c": COLORS.navy }}>
              
              <div className="lead-ic"><Icon name="sun" size={26} /></div>
              <p style={{ fontSize: 13, color: COLORS.navy, fontWeight: 600, margin: "18px 0 6px" }}>The PEERS Education System</p>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 23, margin: "0 0 4px", color: COLORS.ink }}>Sir Rana Iftikhar Sadiq</h3>
              <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
              <span className="when"><Icon name="clock" size={15} /> Morning school, 8:00 AM to 2:00 PM</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15} direction="right" style={{ height: "100%" }}>
            <div className="lead-card" style={{ "--c": "#B87A00" }}>
              <div className="lead-ic"><Icon name="moon" size={26} /></div>
              <p style={{ fontSize: 13, color: "#8A5B00", fontWeight: 600, margin: "18px 0 6px" }}>Primal Academy</p>
              <h3 style={{ fontFamily: "'Lora', serif", fontSize: 23, margin: "0 0 4px", color: COLORS.ink }}>Sir Zeeshan</h3>
              <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>Chief Executive Officer</p>
              <span className="when"><Icon name="clock" size={15} /> Evening academy, 3:00 PM to 8:00 PM</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Legacy / achievements — what PEERS has stood for since 2010 */}
      <section className="cv-auto" style={{ background: COLORS.navy, padding: "64px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 44, alignItems: "center" }}>
          <ScrollReveal delay={0} direction="left">
            <div>
              <SectionTitle icon="award" light title="A decade and more of producing board toppers" />
              <p style={{ fontSize: 15.5, color: "#C6CBE0", lineHeight: 1.9, margin: "-12px 0 0", maxWidth: 560 }}>
                Since {FOUNDING_YEAR}, The PEERS Education System has built a reputation in Shadbagh, Lahore as a
                top-notch quality education and premium-environment school — producing board (Matric) toppers year
                after year through dedicated Topper Test Sessions, Master's-qualified subject teachers in every
                class, and a disciplined, air-conditioned learning environment.
              </p>
            </div>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {[
              ["calendar", <><Counter end={years} suffix="+" /> years</>, "Serving Shadbagh, Lahore since " + FOUNDING_YEAR],
              ["cap", <><Counter end={13} /> classes</>, "From PG to 10th (Matric)"],
              ["layers", <><Counter end={2} /> programs</>, "Morning school and evening academy"],
              ["trophy", "Board toppers", "Produced year after year"],
            ].map(([ic, big, small], i) => (
              <ScrollReveal key={i} delay={0.1 + i * 0.1} direction="scale">
                <div className="stat-tile photo-card">
                  <Icon name={ic} size={26} className="si" />
                  <p className="sn">{big}</p>
                  <p className="sl">{small}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why families choose PEERS */}
      <section className="cv-auto bg-dots" style={{ position: "relative", overflow: "hidden", padding: "80px 24px 72px" }}>
        <Icon name="atom" size={150} stroke={1.2} className="doodle" style={{ right: "4%", top: 40, "--r": "10deg" }} />
        <Icon name="pencil" size={110} stroke={1.2} className="doodle" style={{ left: "2%", bottom: 30, "--r": "-18deg" }} />
        <div style={{ position: "relative", maxWidth: 1140, margin: "0 auto" }}>
          <ScrollReveal>
            <SectionTitle
              icon="shield"
              title="Why families in Shadbagh, Lahore choose PEERS"
              sub="A school is more than a timetable. Here is what a PEERS child and parent can count on, from PG to 10th class."
            />
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 22 }}>
            {features.map(([ic, title, text], i) => (
              <ScrollReveal key={title} delay={(i % 3) * 0.1} style={{ height: "100%" }}>
                <Tilt className="fc-wrap">
                  <div className="fc">
                    <div className="fc-ic"><Icon name={ic} size={26} /></div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <Icon name={ic} size={120} stroke={1.2} className="fc-wm" />
                  </div>
                </Tilt>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sports, practicals, and quality education */}
      <section className="cv-auto pc-section" style={{ background: COLORS.tint, padding: "76px 24px 84px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <ScrollReveal>
            <SectionTitle
              icon="ball"
              title="Sports, practicals, and quality education"
              sub="A look at what learning looks like day-to-day at PEERS."
            />
          </ScrollReveal>
          <div style={{ height: 36 }} />

          <PhotoChapter side="left" src="/sports.jpg" alt="Students playing cricket with their coach" title="Sport is part of the school day">
            <p>Our students train on a real sports ground under qualified coaches, because confidence and teamwork are taught as deliberately as the syllabus.</p>
          </PhotoChapter>
          <PhotoChapter side="right" src="/chemistry-lab.jpg" alt="Students in an air-conditioned PEERS classroom" title="Classrooms built for focus">
            <p>Every classroom is air-conditioned, and every subject is taught by a teacher with a Master&apos;s degree in that subject, so a child can concentrate on understanding, in every season.</p>
          </PhotoChapter>
          <PhotoChapter side="left" src="/physics-class.jpg" alt="Students doing a chemistry experiment in the science lab" title="Experiments, not just textbooks">
            <p>Children run their own experiments in fully equipped science labs, so curiosity turns into understanding they can explain back to you.</p>
          </PhotoChapter>

          <ScrollReveal>
            <blockquote className="pull" style={{ marginTop: 84 }}>
              <Icon name="quote" size={56} stroke={0} className="pq" style={{ fill: "currentColor" }} />
              <p>
                At PEERS, a strong report card is only half the story. Our students train on a real sports
                ground under qualified coaches, run experiments in fully equipped science labs, and sit in
                classrooms built for focus — because we believe confidence, curiosity, and discipline are
                taught just as deliberately as the syllabus.
              </p>
              <p>
                Every subject is taught with the same intent: give a child the tools to understand the
                world, not just pass an exam in it. That's the standard we hold every class to, from PG
                through 10th.
              </p>
            </blockquote>
          </ScrollReveal>
        </div>
      </section>

      {/* Notices preview */}
      <section className="cv-auto" style={{ maxWidth: 1140, margin: "0 auto", padding: "76px 24px" }}>
        <ScrollReveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
            <SectionTitle icon="bell" title="Latest updates" sub="News and notices from the school office." />
            <a href="/notices" className="ft-link" style={{ fontSize: 14, color: COLORS.red, textDecoration: "none", fontWeight: 600, marginBottom: 36 }}>
              View all <Icon name="arrow" size={16} style={{ opacity: 1, transform: "none", color: COLORS.red }} />
            </a>
          </div>
          <NoticesList notices={notices} />
        </ScrollReveal>
      </section>

      {/* Find us */}
      <section className="cv-auto bg-dots" style={{ background: COLORS.tint, padding: "72px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 44 }}>
          <ScrollReveal direction="left">
            <div>
              <SectionTitle icon="pin" title="Find us in Shadbagh, Lahore" />
              <address style={{ fontStyle: "normal", fontSize: 15, color: COLORS.ink, lineHeight: 1.8, margin: "-14px 0 14px" }}>
                <strong>The PEERS Education System</strong><br />
                {SITE_ADDRESS.streetAddress}, {SITE_ADDRESS.addressLocality}, Pakistan
              </address>
              <p style={{ fontSize: 14.5, color: COLORS.muted, lineHeight: 1.8, margin: "0 0 22px" }}>
                Morning school: 8:00 AM to 2:00 PM. Primal Academy (evening): 3:00 PM to 8:00 PM. To ask about
                admissions for PG to 10th class, use the inquiry form or contact the school office.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="/admissions" className="cta-btn" style={{ background: COLORS.red, color: "#fff", padding: "12px 24px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Admissions <Icon name="arrow" size={16} />
                </a>
                <a href="/contact" className="cta-btn" style={{ border: `1px solid ${COLORS.navy}`, color: COLORS.navy, padding: "12px 24px", borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Contact us</a>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" delay={0.1}>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "26px 26px 22px", boxShadow: "0 24px 50px -32px rgba(22,33,94,.45)" }}>
              <h2 style={{ fontFamily: "'Lora', serif", fontSize: 21, fontWeight: 700, color: COLORS.navy, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="sparkle" size={20} style={{ color: COLORS.gold }} /> Quick facts
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  ["calendar", "Established", `${FOUNDING_YEAR}, in Shadbagh, Lahore`],
                  ["cap", "Classes offered", "PG to 10th (Matric)"],
                  ["clock", "School hours", "8:00 AM – 2:00 PM"],
                  ["moon", "Evening academy", "Primal Academy, 3:00 PM – 8:00 PM"],
                  ["building", "Facilities", "Air-conditioned classrooms, science labs, sports ground"],
                  ["phone", "For parents", "Fee vouchers, attendance and results on the Parent Portal"],
                ].map(([ic, label, value]) => (
                  <div key={label} className="qf">
                    <span className="qf-ic"><Icon name={ic} size={18} /></span>
                    <div>
                      <p className="qf-l">{label}</p>
                      <p className="qf-v">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="cv-auto" style={{ maxWidth: 900, margin: "0 auto", padding: "76px 24px" }}>
        <SectionTitle icon="help" align="center" title="Questions parents ask" sub="Straight answers to what families want to know before they join." />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FAQS.slice(0, 4).map((f, i) => (
            <ScrollReveal key={f.q} delay={i * 0.08}>
              <div className="faq-row">
                <span className="faq-ic"><Icon name="help" size={20} /></span>
                <div>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p style={{ margin: "24px 0 0", fontSize: 14.5, textAlign: "center" }}>
          <a href="/faqs" className="ft-link" style={{ color: COLORS.red, textDecoration: "none", fontWeight: 600 }}>
            See all questions and answers <Icon name="arrow" size={16} style={{ opacity: 1, transform: "none", color: COLORS.red }} />
          </a>
        </p>
      </section>

      {/* Admissions CTA */}
      <section className="cv-auto" style={{ position: "relative", overflow: "hidden", background: `linear-gradient(120deg, ${COLORS.navy}, #223099 60%, ${COLORS.navy})`, padding: "60px 24px" }}>
        <Icon name="sparkle" size={170} stroke={1} className="doodle" style={{ right: "6%", top: -20, color: "#F0A500", opacity: 0.16, "--r": "8deg" }} />
        <Icon name="book" size={120} stroke={1} className="doodle" style={{ left: "3%", bottom: -20, color: "#fff", opacity: 0.08, "--r": "-10deg" }} />
        <ScrollReveal>
          <div style={{ position: "relative", maxWidth: 1140, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 22 }}>
            <div>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: 27, color: "#fff", margin: "0 0 8px" }}>
                Ready to join The PEERS Education System?
              </h2>
              <p style={{ fontSize: 15, color: "#C6CBE0", margin: 0 }}>Admissions for the new session are open now.</p>
            </div>
            <a href="/admissions" className="cta-btn" style={{ background: COLORS.red, color: "#fff", padding: "15px 32px", borderRadius: 6, fontSize: 15, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
              Start application <Icon name="arrow" size={18} />
            </a>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
