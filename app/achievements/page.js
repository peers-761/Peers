import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { COLORS } from "../../lib/theme";
import { readDB } from "../../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Achievements",
  description: "Achievements and proud moments of students at The PEERS Education System, Shadbagh, Lahore.",
  alternates: { canonical: "/achievements" },
};

export default async function AchievementsPage() {
  const db = await readDB();
  const achievements = db.achievements || [];

  return (
    <div>
      <Header />
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>ACHIEVEMENTS</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 12px" }}>
          Milestones we're proud of
        </h1>
        <p style={{ fontSize: 15, color: COLORS.muted, margin: "0 0 40px", maxWidth: 560 }}>
          Awards, results, and moments from across The PEERS Education System and Primal Academy.
        </p>

        {achievements.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 32 }}>
            <p style={{ fontSize: 14, color: COLORS.muted, margin: 0 }}>
              Achievements will appear here once added from the admin dashboard.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {achievements.map((a) => (
              <div key={a.id} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}`, background: "#fff" }}>
                {a.image && <img src={`/api/image?key=${a.image}`} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />}
                <div style={{ padding: "12px 14px" }}>
                  {a.text && <p style={{ fontSize: 13.5, color: COLORS.ink, margin: "0 0 6px", lineHeight: 1.6 }}>{a.text}</p>}
                  <p style={{ fontSize: 11.5, color: "#9A9A90", margin: 0 }}>{a.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
