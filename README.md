# The PEERS Education System — Website

Built with Next.js, deployed on Netlify. Public website + admin dashboard
(`/admin`) + teacher attendance portal (`/teacher`) + parent portal
(`/parent`).

## Data storage

Data (students, attendance, notices, fees, messages) is stored in
**Netlify Blobs**, Netlify's built-in key-value store. No external
database account or environment variables are needed — this is what
makes add/edit/delete changes actually stick permanently on the live
site. Locally (`npm run dev` without `netlify dev`), it falls back to
the local `data/db.json` file, which is fine for local testing.

## Login details

**Admin** — go to `/admin`
- Username: `peers3311`
- Password: `031234567890*@`

**Teachers** — go to `/teacher`
- Armaan Abrar (Class 9 attendance) — username: `armaanabrar`, password: `031234567890*@`
- Rana Ehsaan (Class 10 attendance) — username: `ranaehsaan`, password: `031234567890*@`
- Add more teachers, and assign them to specific classes, from Admin → Teachers.

**Parents** — go to `/parent`
- Sign in with a Student ID and 4-digit PIN.
- Every student gets a PIN automatically when added from Admin →
  Students — the PIN is shown next to their name there, so the office
  can hand it to the parent.

⚠️ These are stored in plain text in `lib/auth.js` and the database, on
your own request, with no environment variables. **Keep your GitHub repo
Private** — if it's public, anyone can read these files and log in as
admin.

## What's in the admin dashboard

- **Overview** — quick stats, and a button to turn on push notifications
  on that device (see below).
- **Notices** — post announcements, optionally with a photo.
- **Fee structure** — edit the monthly fee per class.
- **Students** — add/remove students per class; each student gets a
  parent login PIN shown here.
- **Teachers** — add/remove teacher accounts and assign classes.
- **Attendance records** — view who marked attendance for a class/date.
- **Admission inquiries** — every submission from the public Admissions
  form appears here, with the required phone number.
- **Contact messages** — every submission from the public Contact form
  appears here.
- **Contact settings** — edit the address/phone/WhatsApp/email shown on
  the public Contact page and site footer.

## Push notifications

From Admin → Overview, click "Enable notifications" once on the device
you want alerts on (your phone or computer). After that, you'll get a
notification when:
- A teacher saves attendance for their class.
- A new notice is posted.
- Someone submits the Admissions or Contact form.

This uses the standard Web Push API with a self-generated key pair
(`lib/vapid.js`) — no Firebase or other external push service account is
needed. If you ever want to rotate the keys, generate a new pair with
the `web-push` npm package's `generateVAPIDKeys()` and replace both
values in `lib/vapid.js`.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploying (GitHub + Netlify)

1. Push this folder to a **new, Private** GitHub repository.
2. On netlify.com, sign up with GitHub, then "Add new site" → import
   that repository. Netlify auto-detects Next.js.
3. Once deployed, rename the site (Project details → Change site name)
   or connect a real domain (Domain management → Add a domain).
4. Update `SITE_URL` in `lib/seo.js` to match whatever domain you end up
   using — this is used for SEO tags and the sitemap.

## SEO

- `lib/seo.js` holds your site URL, address, and target keyword phrases.
- `app/layout.js` includes an EducationalOrganization schema (name, logo,
  address) — this is what lets your logo appear next to your site in
  Google search results, once the site is indexed and verified in Google
  Search Console.
- `app/faqs/page.js` includes FAQ schema for rich Google results.
- `app/sitemap.js` and `app/robots.js` are generated automatically.

Ranking for competitive phrases like "Best Education Institute of
Pakistan" also depends on things outside the code: a verified Google
Business Profile, parent reviews, and other sites linking to yours. The
on-page setup here is the foundation; those steps are the next layer.
