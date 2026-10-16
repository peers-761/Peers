import { readDB } from "../../lib/data";
import { SITE_URL } from "../../lib/seo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact Us — Amir Road, Shadbagh, Lahore",
  description:
    "Contact The PEERS Education System at 33 School Street, Amir Road, Shadbagh, Lahore. Phone, WhatsApp, email and a form to message the school office.",
  alternates: { canonical: "/contact" },
};

// Adds the school's phone / email (set by the admin under Contact settings)
// to Google's structured data for this page.
export default async function ContactLayout({ children }) {
  let settings = {};
  try {
    settings = (await readDB()).settings || {};
  } catch (e) {}

  const points = [];
  if (settings.phone) points.push({ "@type": "ContactPoint", contactType: "admissions", telephone: String(settings.phone), areaServed: "PK", availableLanguage: ["English", "Urdu"] });
  if (settings.email) points.push({ "@type": "ContactPoint", contactType: "customer service", email: String(settings.email), areaServed: "PK" });

  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_URL}/#school`,
    ...(settings.phone ? { telephone: String(settings.phone) } : {}),
    ...(settings.email ? { email: String(settings.email) } : {}),
    ...(points.length ? { contactPoint: points } : {}),
  };

  return (
    <>
      {points.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
