import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_ALT_NAME, SITE_ADDRESS, SOCIAL_LINKS, TARGET_KEYWORDS, FOUNDING_YEAR } from "../lib/seo";

const DEFAULT_TITLE = "The PEERS Education System | Top-Notch Quality Education in Shadbagh, Lahore";
const DEFAULT_DESCRIPTION =
  `Lahore's premium-environment school since ${FOUNDING_YEAR}, PG to 10th, producing board toppers year after year. Air-conditioned classrooms, Master's-qualified subject teachers, science labs, co-curricular activities for board students, and a parent portal. The PEERS Education System, Amir Road, Shadbagh. Apply today.`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | The PEERS Education System",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: TARGET_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: "/logo-full.png", alt: SITE_NAME }],
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/logo-full.png"],
  },
  // Paste the code Google Search Console gives you into the Vercel
  // environment variable NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to prove
  // you own the site. Nothing is added while the variable is empty.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  other: {
    "geo.region": "PK-PB",
    "geo.placename": "Shadbagh, Lahore",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["EducationalOrganization", "School"],
  "@id": `${SITE_URL}/#school`,
  name: SITE_NAME,
  alternateName: SITE_ALT_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-full.png`,
  image: `${SITE_URL}/logo-full.png`,
  slogan: "We Take You Along",
  foundingDate: FOUNDING_YEAR,
  description:
    `Lahore's premium-environment school since ${FOUNDING_YEAR}, teaching PG to 10th class in Shadbagh, Pakistan. Air-conditioned classrooms, Master's-qualified subject teachers in every class, science labs, sports, co-curricular activities for board students, and Topper Test Sessions — producing board toppers year after year.`,
  award: `Producing top-performing board (Matric) students year after year since ${FOUNDING_YEAR}`,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE_ADDRESS.streetAddress,
    addressLocality: SITE_ADDRESS.addressLocality,
    addressRegion: SITE_ADDRESS.addressRegion,
    addressCountry: SITE_ADDRESS.addressCountry,
  },
  areaServed: [{ "@type": "City", name: "Lahore" }],
  sameAs: SOCIAL_LINKS.map((s) => s.url),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/emblem.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/emblem.png" />
        <meta name="theme-color" content="#16215E" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
