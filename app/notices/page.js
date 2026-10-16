import Header from "../../components/Header";
import Footer from "../../components/Footer";
import NoticesList from "../../components/NoticesList";
import { COLORS } from "../../lib/theme";
import { readDB } from "../../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Notices and Updates",
  description: "Latest notices, announcements and updates from The PEERS Education System, Shadbagh, Lahore.",
  alternates: { canonical: "/notices" },
};

export default async function NoticesPage() {
  const db = await readDB();
  const notices = [...db.notices].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <Header />
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, margin: "0 0 12px" }}>NOTICES</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 32, color: COLORS.navy, margin: "0 0 32px" }}>
          Announcements and updates
        </h1>
        <NoticesList notices={notices} />
      </section>
      <Footer />
    </div>
  );
}
