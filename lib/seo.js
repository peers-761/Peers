// The website's public address. It is read from the NEXT_PUBLIC_SITE_URL
// environment variable on Vercel, so when the school buys its own domain
// (e.g. https://www.peerseducationsystem.com) you only change that ONE
// variable and redeploy — no code edit needed. Until then it falls back to
// the live Vercel address, so the sitemap, canonical links and Google
// structured data all point to a real, working website.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://peers-761.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "The PEERS Education System";
export const SITE_ALT_NAME = "Primal Early Education Reforms School";
export const FOUNDING_YEAR = "2010";

export const SITE_ADDRESS = {
  streetAddress: "33 School Street, Amir Road, Shadbagh",
  addressLocality: "Lahore",
  addressRegion: "Punjab",
  addressCountry: "PK",
};

export const SOCIAL_LINKS = [
  { name: "Instagram", url: "https://www.instagram.com/the_peers_education_system" },
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=100092534901505" },
];

// Phrases parents actually search for. Researched against what real "best
// school" / "top schools" articles and parent questions for Lahore target
// (Oct 2026) — mostly local, long-tail phrases PEERS can realistically be
// found for, plus a few broad ones every school in the city also tries for.
// Used in metadata and worked naturally into page copy — never repeated
// mechanically (Google penalises keyword stuffing).
export const TARGET_KEYWORDS = [
  // Brand
  "The PEERS Education System",
  "PEERS Education System Lahore",
  "Primal Early Education Reforms School",
  "Primal Academy Lahore",

  // Local — where a small neighbourhood school actually has a real chance to rank
  "best school in Shadbagh Lahore",
  "school in Shadbagh Lahore",
  "school on Amir Road Lahore",
  "school near me Shadbagh",
  "private school near Shadbagh Lahore",
  "affordable school in Shadbagh Lahore",

  // Broad — what parents type first, before narrowing to a neighbourhood
  "best school in Lahore",
  "top schools in Lahore",
  "top 10 schools in Lahore",
  "affordable schools in Lahore",
  "good school near me Lahore",
  "best private school in Lahore",

  // What the school actually offers, worded the way parents search it
  "Best Education Institute of Lahore",
  "school with sports and science labs in Lahore",
  "school with good environment Lahore",
  "safe and disciplined school Lahore",
  "PG to 10th school Lahore",
  "matric school Lahore",
  "school with parent portal Lahore",
  "online fee challan school Lahore",
  "air conditioned classrooms school Lahore",
  "school with AC classrooms Lahore",
  "school with qualified teachers Lahore",
  "teachers with master's degree school Lahore",
  "school with co-curricular activities Lahore",
  "co-curricular activities for board students Lahore",
  "topper test session school Lahore",
  "school producing board toppers Lahore",
  "best board result school Lahore",
  "premium environment school Lahore",
  "top notch quality education Lahore",

  // Admissions — the "action" searches that turn into actual enquiries
  "school admissions Lahore",
  "school admission 2026 Lahore",
  "school admission open near me",
];
