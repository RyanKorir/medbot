# Medbot status

Goal: build once, keep it simple, no constant tweaking, but stay scalable and secure.
Shape of the system: one repo, one Vercel project, one Supabase project. Nothing else to run.

## Done
- [x] Symptom checker (in-browser, age/sex, red-flag triage, low-confidence warning, WhatsApp share)
- [x] Accounts: patient / doctor / admin, consent at signup, profile page, forgot + reset password
- [x] Doctor directory with ratings; realtime chat; symptom summary handed to the doctor
- [x] Trust basics: KMPDC licence number + document, admin review, close consultation, reviews
- [x] M-Pesa STK Push (sandbox-ready), chat locked until paid, admin payments panel, payments OFF by default
- [x] Reviews UI (comments on each doctor, doctor sees own rating), admin overview (users, consultations, revenue, ratings, checker accuracy)
- [x] FHIR R4 export of a consultation (patient or doctor, JSON); doctor records a confirmed diagnosis when closing, which builds a real labelled dataset
- [x] M-Pesa status check (STK Push Query) as a fallback when Safaricom's callback is missed
- [x] Model evaluation tool: scripts/evaluate_vignettes.py (top-1/top-3 accuracy, under-triage rate) for clinician-written vignettes
- [x] Symptom checker uses Kenyan outpatient prevalence (scripts/kenya_priors.csv) + a "can't-miss" rule for serious conditions; datasets reviewed in docs/DATASETS.md
- [x] In-app contact: patients message a verified specialist with a reason (symptom check attached), one open conversation per doctor, inbox with unread counts, doctors see "New request", video/voice call button (free public Jitsi room, opens in a new tab)
- [x] Security pass: Next.js upgraded to patched 16.4.3 (0 audit findings), ~100 simulated attacks (see docs/SECURITY.md), review privacy fix, rate limits, honeypots + scanner traps + decoy API functions + security events panel, optional 2FA (enforced for admins who enable it), CSP/HSTS headers, optional CAPTCHA
- [x] Hardening: row-level security everywhere, private licence storage, database indexes, security headers,
      daily keep-alive cron (stops Supabase free plan pausing), monthly Dependabot updates

## Not done yet (parked on purpose; only build if you actually need them)
- [ ] Step 3: appointment slots, reminders, notifications
- [ ] Step 4b: video embedded inside the page (needs a Jitsi JaaS free account, 25 users, or Daily.co; needs your keys)
- [ ] Email / WhatsApp / push alerts for new messages when the app is closed (today: unread count inside the app, refreshed every 30 seconds)
- [ ] Step 5: visit notes, prescriptions, patient records, admin analytics, audit log
- [ ] Swahili (needs a native-speaker review of the safety messages)
- [ ] DDXPlus integration: download it from figshare (blocked from the build environment) and share release_evidences.json, release_conditions.json and a train CSV sample, then map it to the symptom list.
- [ ] A better model: needs ~100+ clinician-written vignettes (format: scripts/examples/vignettes_template.csv) or a licensed clinical dataset. Run the evaluation script, then retrain. Follow-up questions come after that.
- [ ] M-Pesa refunds and doctor payouts
- [ ] Admin screens for managing users (today: SQL in Supabase)
- [ ] SMS / USSD access for basic phones

## Waiting on you
- [ ] Security checklist in docs/SECURITY.md (Supabase password length, CAPTCHA, rate limits, 2FA on your accounts)
- [ ] Payments are switched ON in /admin but the M-Pesa keys are not in Vercel: add the keys or switch payments off
- [ ] Safaricom Daraja sandbox keys -> add MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET in Vercel -> turn payments on in /admin
- [ ] Revoke the GitHub token that was pasted in chat; change the passwords from superadmin.txt
- [ ] Supabase: set Site URL to https://medbot-xi-one.vercel.app (Authentication -> URL Configuration)

## Remind-me-when (triggers, not dates)
| When this happens | Do this |
|---|---|
| First real patient or doctor signs up | Upgrade Supabase to Pro ($25/mo: no pausing, daily backups). Register with the ODPC (Kenya Data Protection Act). |
| A doctor has closed about 50 consultations with a diagnosis | Look at the checker accuracy in /admin. Use those labels to retrain or retire the checker. |
| Ready to take real money | Safaricom Go-Live (Paybill/Till), set MPESA_ENV=production + MPESA_SHORTCODE + MPESA_PASSKEY, add the status-check fallback and a refund process |
| A Dependabot pull request appears | Check the Vercel preview, merge it (5 minutes, about monthly) |
| Supabase emails a pause warning | Check the daily cron is running (Vercel -> Settings -> Cron Jobs) |
| Once a year | Rotate the Supabase keys and M-Pesa secrets; review who is an admin |
