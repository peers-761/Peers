import { SITE_URL } from "../lib/seo";

// Private areas (admin, teachers, in-charge, parent dashboard) are kept out
// of Google. The parent LOGIN page (/parent) is crawlable but marked
// noindex in its layout; /api stays open so public images still load.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/teacher", "/incharge", "/parent/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
