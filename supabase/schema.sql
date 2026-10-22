-- Medbot schema. Run once in Supabase -> SQL Editor.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'patient' check (role in ('patient','doctor','admin')),
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key references public.profiles(id) on delete cascade,
  specialty text not null,
  hospital text,
  bio text,
  fee_kes integer not null default 0,
  verified boolean not null default false   -- an admin flips this after checking KMPDC registration
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  doctor_id uuid not null references public.doctors(id),
  symptoms text[] not null default '{}',
  top_prediction text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.reviews (
  consultation_id uuid primary key references public.consultations(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text
);

-- Kenya DPA 2019: record explicit consent before health data is processed.
create table public.consents (
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, purpose)
);

-- New auth user -> profile. Admin can never be self-assigned from signup metadata.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when new.raw_user_meta_data->>'role' = 'doctor' then 'doctor' else 'patient' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Row Level Security: the fix for the original app's "any user can read any consultation" hole.
alter table public.profiles      enable row level security;
alter table public.doctors       enable row level security;
alter table public.consultations enable row level security;
alter table public.messages      enable row level security;
alter table public.reviews       enable row level security;
alter table public.consents      enable row level security;

create function public.is_participant(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from consultations where id = c and (patient_id = auth.uid() or doctor_id = auth.uid()))
$$;

create policy "own profile" on public.profiles for select using (id = auth.uid());
create function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;
create function public.my_verified() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select verified from doctors where id = auth.uid()), false)
$$;
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (role = public.my_role());
create policy "see counterpart" on public.profiles for select using (
  exists (select 1 from consultations c where (c.patient_id = auth.uid() and c.doctor_id = profiles.id) or (c.doctor_id = auth.uid() and c.patient_id = profiles.id)));
create policy "doctor profiles for listed doctors" on public.profiles for select using (exists (select 1 from doctors d where d.id = profiles.id and d.verified));

create policy "verified doctors are public" on public.doctors for select using (verified or id = auth.uid());
create policy "doctor edits own row" on public.doctors for insert with check (id = auth.uid() and verified = false and public.my_role() = 'doctor');
create policy "doctor updates own row" on public.doctors for update using (id = auth.uid()) with check (verified = public.my_verified());

create policy "participants read" on public.consultations for select using (patient_id = auth.uid() or doctor_id = auth.uid());
create policy "patient creates" on public.consultations for insert with check (patient_id = auth.uid());

create policy "participants read messages" on public.messages for select using (public.is_participant(consultation_id));
create policy "participants send messages" on public.messages for insert with check (sender_id = auth.uid() and public.is_participant(consultation_id));

create policy "patient reviews own consultation" on public.reviews for insert with check (
  exists (select 1 from consultations c where c.id = consultation_id and c.patient_id = auth.uid()));
create policy "reviews of verified doctors are public" on public.reviews for select using (true);

create policy "own consents" on public.consents for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.messages;

-- Admin access (added in v0.2). Promote an account with:
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
create policy "admin reads all profiles" on public.profiles for select using (public.my_role() = 'admin');
create policy "admin reads all doctors" on public.doctors for select using (public.my_role() = 'admin');
create policy "admin verifies doctors" on public.doctors for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- v0.3: symptom-check summary attached to a consultation (urgency, age group, sex)
alter table public.consultations
  add column if not exists urgency text check (urgency in ('emergency','soon','routine')),
  add column if not exists age_group text check (age_group in ('child','adult','senior')),
  add column if not exists sex text check (sex in ('female','male'));
