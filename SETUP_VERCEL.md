# Vercel par is project ko chalane ke liye setup (ek dafa karna hai)

Ye steps sirf ek baar karni hain — code push karne ke baad Vercel Dashboard
(browser) me karni hain, Termux me nahi.

## 1. Database (Neon Postgres) — pehle se ban chuki hai

Agar tumne pehle hi Storage tab se **Neon** database bana kar apne project se
connect ki hui hai, to koi extra kaam nahi karna — code use khud dhoond
lega. Bas confirm kar lo:

1. https://vercel.com par apne project me jao → **Storage** tab
2. Neon database ke neeche "peers" (apna project) **All Environments**
   ke sath connected dikhna chahiye — agar sirf kuch environments tick
   hain to us par tap karke sab (Production, Preview, Development) tick
   kar do
3. Deployments tab me jaake **latest deployment ko Redeploy** kar do
   (taake DATABASE_URL naya code use kar sake)

Agar Neon database bilkul nahi hai, to Storage tab → "Create Database" →
"Postgres" ya "Neon" search karke bana lo, phir "Connect to Project" karo.

## 2. Cron jobs ke liye secret set karo

1. Project → Settings → Environment Variables
2. Ek naya variable add karo: Name = `CRON_SECRET`, Value = koi bhi lamba
   random text (jaise `peers2026cronXYZ`) — ye sirf tumhare aur cron ke
   darmiyan ek password hai
3. Save karo aur dobara Redeploy karo

## 3. Fee Reminder (aur mahine ka naya voucher) — automatic chal jayega

`vercel.json` me already set hai — har roz raat **12:15 AM (Pakistan time)**
check karega. Ye hi woh check hai jo mahine ki 1 tareekh ko naye vouchers
banata hai aur purane unpaid voucher ko naye me merge karta hai, is liye
raat ko jald chalta hai taake subah tak sab tayyar ho. Har mahine ki **10
tareekh** ko un parents ko bhi notification bhejta hai jinki fee abhi tak
verify nahi hui. Koi extra kaam nahi karna.

(Note: Vercel cron ke schedule hamesha **UTC** time me likhe jate hain,
Pakistan time nahi — `vercel.json` me `"15 19 * * *"` ka matlab hai UTC
19:15 = Pakistan 12:15 AM. Agar kabhi schedule badalna ho to isi hisaab se
UTC me convert karke likhna.)

**Agar kisi din voucher turant chahiye ho** (cron ka wait na karna ho), to
Admin ya Incharge sirf **Fee Verification** page khol lein — khulte hi
us waqt ke liye sab students ke vouchers turant (bina cron ke) ban jate
hain.

## 4. Teacher Absent Escalation — har 15 minute wala check

Vercel ke **free (Hobby) plan** par cron jobs sirf **din me 1 dafa** chal
sakte hain — har 15 minute wala schedule free plan par allowed nahi hai.
Isliye is feature (jo har 15 min baad check karta hai ke teacher ne
attendance lagayi ya nahi) ke liye ek **free external service** use karo:

1. https://cron-job.org par free account banao
2. Naya cron job banao:
   - URL: `https://TUMHARI-SITE.vercel.app/api/cron/attendance-check?secret=TUMHARA_CRON_SECRET`
     (yahan apni actual site ka URL aur upar wala CRON_SECRET dalo)
   - Schedule: har 15 minute
3. Save kar do — bas, ye ab har 15 min me apne aap us API ko call karega

(Agar future me Vercel Pro plan lete ho, to isi endpoint ko `vercel.json`
ke andar cron me bhi daal sakte ho, phir external service ki zaroorat nahi
rahegi.)

## 5. Push Notifications (VAPID keys)

Ye keys `lib/vapid.js` file ke andar seedha code me likhi hui hain (environment
variable nahi hain), is liye Vercel par inke liye kuch alag se set nahi karna
— jaisi they waisi hi kaam karengi.
