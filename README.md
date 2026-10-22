# Medbot

Symptom checker + online doctor consultations for Kenya. Pure Next.js 14 (App Router) + Tailwind + Supabase. Free tiers: Vercel + Supabase.

## Run it
1. `npm install`
2. Create a free project at supabase.com. In **SQL Editor**, run `supabase/schema.sql`.
3. `cp .env.example .env.local` and fill in the project URL + anon key (Settings → API).
4. `npm run dev` → http://localhost:3000
5. Deploy: push to GitHub, import in Vercel, add the same two env vars.

## Making a doctor visible
Doctors sign up with the "doctor" role, then insert a row in `doctors` (specialty, hospital, fee). An admin verifies their KMPDC registration and sets `verified = true` in the Supabase table editor. Only verified doctors appear in the directory.

## How the symptom checker works
`scripts/build_model.py` turns `Training.csv` into Naive Bayes tables (`src/data/model.json`). `src/lib/predict.ts` scores them in the browser, so symptoms never leave the device. `src/lib/triage.ts` holds the corrected specialist map and the red-flag list that forces an emergency warning.

## Roadmap
Appointment slots, M-Pesa STK Push (Daraja) for fees, reviews UI, admin dashboard, FHIR export, a better model trained on real clinical vignettes.
