# PEERS Website — Demo Q&A Cheat Sheet

Quick answers for likely technical questions during the demo.

---

**Q: Website kis technology pe bani hy?**
Next.js (React framework) — abhi is waqt sabse zyada industry-demand wala full-stack JavaScript stack hy. Frontend aur backend (API routes) dono isi ek codebase me hain.

**Q: Hosting kahan hy?**
Netlify. GitHub se seedha connected hy — jab bhi code update hota hy, site khud rebuild ho kar live ho jati hy (CI/CD).

**Q: Database kya use ki hy? SQL, MongoDB?**
Netlify Blobs — Netlify ka apna built-in key-value store. Ek chhoti school ke data (students, attendance, fees, notices) ke liye ye kaafi hy, aur koi alag database account/subscription nahi chahiye. Agar future me student count bohat zyada barh jaye (jaise multi-branch, hazaron records), to Postgres (Supabase/Vercel Postgres) pe move kar sakte hain — code isi tarah likha gaya hy ke ye switch aasan ho, sirf ek file (`lib/data.js`) badalni paregi.

**Q: Passwords hash nahi hain, security masla nahi?**
School ki apni request thi ke simplicity ke liye plain-text rakha jaye (env variables/hashing ka jhanjhat nahi chahiye tha). Isliye GitHub repo **Private** rakha gaya hy — jitni der repo private hy, koi bahar wala credentials nahi dekh sakta. Production-grade security (bcrypt hashing, JWT, rate-limiting) add karna future upgrade hy, feature nahi missing hy — jaan-boojh kar simple rakha gaya.

**Q: Attendance/fee data kitna safe hy, backup hota hy?**
Netlify Blobs Netlify ke apne infrastructure pe persist hota hy (unlike a plain file, jo serverless pe reset ho jati thi — wo bug fix ho chuka hy). Manual export/backup feature abhi nahi hy — agla reasonable step hy periodic backup (e.g. weekly JSON export) add karna.

**Q: Notifications kaise kaam karti hain? Firebase use kiya?**
Nahi, Firebase nahi — ye browser ka native **Web Push API** hy (VAPID keys ke sath), bilkul standard/open protocol, koi third-party account ya cost nahi. Har device individually "Enable notifications" karta hy.

**Q: Mobile app hy ya sirf website?**
Sirf website hy, lekin ye **responsive** hy (mobile/tablet/desktop sab pe chalti hy) aur notifications, offline-capable service worker jaisi "app-like" features already hain. Alag se native app (Play Store) banane ka koi commitment nahi hy, lekin future me PWA (Progressive Web App) install-to-home-screen add kiya ja sakta hy.

**Q: Multiple schools/branches handle kar sakti hy?**
Abhi single-campus (PEERS) ke liye specifically banayi hy. Multi-branch banane ke liye database schema me thoda rework hoga (har branch ka alag data-space) — ye ek separate project scope hoga.

**Q: Load kitna handle kar sakti hy? Traffic barhne pe crash to nahi hogi?**
Netlify serverless hy — matlab traffic barhne par khud automatically scale hoti hy (auto-scaling infrastructure), ek chhoti school ke liye far beyond enough hy.

**Q: Kisi ne code review kiya, ya sirf AI se bana hy?**
AI (Claude) ke sath step-by-step bana hy, real testing ke sath (aapke diye gaye feedback/bugs sab fix hue hain). Ek professional developer chahen to code review kar sakte hain — code readable/organized hy (Next.js standard structure), koi obfuscation nahi.

---

### Aaj Demo Se Pehle Karne Wali Cheezein
- Ek dum fresh login karein (admin/teacher/parent), purane test sessions clear karne ke liye.
- Jis phone/device pe demo dena hy, wahan pehle se "Enable notifications" na dabaya ho to dabayein taake live dikha sakein.
- Internet connection stable jagah pe khare hon (Netlify cold-start pehli baar 2-3 second le sakta hy).
