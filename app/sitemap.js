import { SITE_URL } from "../lib/seo";

const PAGES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/admissions", priority: 0.9, changeFrequency: "monthly" },
  { path: "/academics", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faqs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/notices", priority: 0.6, changeFrequency: "weekly" },
  { path: "/achievements", priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap() {
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
