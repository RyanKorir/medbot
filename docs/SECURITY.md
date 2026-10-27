# Medbot security notes

Medbot contains no PHP. It is TypeScript (Next.js) plus SQL (Supabase Postgres). The old Django/Python app is retired.

## Layers
1. **The database is the real lock.** Row Level Security on every table. A signed-in user can only touch their own conversations, payments and consents; doctors only theirs; admins can see statistics and licences but **not chat contents or symptoms**. Payments, paid status, roles, verification and consultation status cannot be changed from the browser: only vetted database functions do that.
2. **Money.** The amount comes from the doctor's fee in the database, never from the browser. M-Pesa confirmations are accepted only with a secret known to the server and checked again inside the database. Payment prompts are rate limited (5 per 10 minutes) and phone numbers are validated.
3. **Abuse limits.** 20 messages per minute, 10 new conversations per hour, one open conversation per patient and doctor.
4. **Two-factor.** Any user can switch on an authenticator app (Profile). Once an admin has done so, admin powers only work in a session that passed the code: a stolen password alone is not enough, enforced in the database.
5. **Browser rules.** Content-Security-Policy, HSTS, no framing, no MIME sniffing, strict referrer policy.
6. **Traps** (admin page, "Security events", kept 30 days):
   - hidden form fields and too-fast submissions on login, signup and reset (bots)
   - scanner paths (WordPress, `.php`, `.env`, `.git`, phpMyAdmin ...) answered with 404 and logged
   - decoy API functions (`export_all_patient_records`, `get_all_users`, `admin_dump`, `list_all_payments`) that return nothing and log the caller
   - the log itself is flood-capped (60 events per minute) and cannot be read or erased by non-admins
7. **Login friction.** Lockout with growing delay after 3 failed attempts in the page, and an optional Cloudflare Turnstile CAPTCHA (set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Note: page-level friction only slows bots that use the form. The real brute-force protection is Supabase's auth rate limits and server-side CAPTCHA (see checklist).
8. **Dependencies.** Next.js 16.4.3 (patched), `npm audit`: 0 known vulnerabilities. Monthly Dependabot pull requests.

## Tested
About 100 simulated attacks against the database rules as anonymous visitor, patient, doctor, unverified doctor and admin (with and without 2FA): reading others' data, tampering with chats and payments, forging payments and callbacks, privilege escalation, flooding, log tampering. Plus web-layer probes against the running app (scanner paths, forged callbacks, SQL-injection strings, malformed bodies, path traversal). Findings that were fixed: Next.js with ~20 known vulnerabilities, review table readable by anyone, no rate limits, no trap or 2FA layer, admin panel could show a payments-on state with no keys.

## Not covered (be honest)
- Real brute-force and credential-stuffing defence lives in Supabase Auth settings; see the checklist.
- A CSP that allows inline scripts (needed by Next.js) is weaker against XSS than a nonce-based one.
- No independent penetration test has been done. Do one before handling real patient data at scale.
- Chat messages are protected in transit and at rest by Supabase but are not end-to-end encrypted. The free Jitsi call link is a third-party service.

## Owner checklist (cannot be done from code)
- [ ] Supabase -> Authentication: minimum password length 10, require letters and numbers
- [ ] Supabase -> Authentication -> Attack Protection: enable CAPTCHA (Turnstile), then set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel
- [ ] Supabase -> Authentication -> Rate Limits: tighten sign-in / sign-up / password reset limits
- [ ] Supabase -> Authentication -> URL Configuration: Site URL = your Vercel URL; allow-list only that redirect
- [ ] Turn on two-factor for your own admin account (Profile -> Set up two-factor)
- [ ] Two-factor on your GitHub, Vercel and Supabase logins
- [ ] Revoke the GitHub token that was pasted in chat; change the passwords from `superadmin.txt`
- [ ] Supabase Pro before real patients (backups, no pausing, leaked-password protection)
- [ ] Register with the ODPC (Kenya Data Protection Act)
